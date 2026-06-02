import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Archive, RotateCcw, Users } from 'lucide-react';
import { batchService } from '../../services/batchService';
import { userService } from '../../services/userService';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import { WidgetSkeleton } from '../../components/ui/Skeleton';
import type {
  Batch,
  BatchMember,
  BatchMemberStatus,
  BatchStatusFilter,
  BatchStatusOverride,
  CreateBatchPayload,
} from '../../types/batch';
import type { User } from '../../types/user';

const STATUS_TABS: { key: BatchStatusFilter; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'archived', label: 'Archived' },
  { key: 'all', label: 'All' },
];

type BatchFormState = {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  supervisor_id: string;
  capacity: string;
  status_override: '' | BatchStatusOverride;
};

const emptyForm: BatchFormState = {
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  supervisor_id: '',
  capacity: '',
  status_override: '',
};

const toIsoDate = (value?: string | Date | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isIntern = (user: User): boolean =>
  Array.isArray(user.departments) &&
  user.departments.some((d) => d.department_role === 'Intern');

export default function BatchesPage() {
  const { user: currentUser } = useAuthStore();
  const canManage =
    currentUser?.global_role === 'Superadmin' ||
    currentUser?.global_role === 'Admin';

  const [batches, setBatches] = useState<Batch[]>([]);
  const [internsAlreadyAssigned, setInternsAlreadyAssigned] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<BatchStatusFilter>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<BatchFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [membersModalBatch, setMembersModalBatch] = useState<Batch | null>(null);
  const [members, setMembers] = useState<BatchMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberToAddIds, setMemberToAddIds] = useState<string[]>([]);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [memberOpError, setMemberOpError] = useState('');

  const [archiveTarget, setArchiveTarget] = useState<Batch | null>(null);

  // ── data loading ────────────────────────────────────────────────────────────

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await batchService.list(statusFilter);
      setBatches(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load batches.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchUsers = useCallback(async () => {
    try {
      const users = await userService.getAllUsers();
      setAllUsers(users);
    } catch {
      // non-fatal
    }
  }, []);

  const fetchAssignedIds = useCallback(async () => {
    try {
      const ids = await batchService.listAssignedUserIds();
      setInternsAlreadyAssigned(new Set(ids));
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => {
    if (canManage) {
      fetchUsers();
      fetchAssignedIds();
    }
  }, [canManage, fetchUsers, fetchAssignedIds]);

  const supervisorOptions = useMemo(
    () =>
      allUsers.filter(
        (u) =>
          u.global_role === 'Admin' ||
          u.departments?.some((d) =>
            ['Head', 'Supervisor'].includes(d.department_role),
          ),
      ),
    [allUsers],
  );

  const internOptions = useMemo(() => allUsers.filter(isIntern), [allUsers]);

  const memberUserIds = useMemo(
    () => new Set(members.map((m) => String(m.user._id))),
    [members],
  );
  // Interns can belong to only one batch — filter out anyone already assigned
  // anywhere (and anyone already in this batch).
  const internsAvailable = useMemo(
    () =>
      internOptions.filter((u) => {
        const id = String(u.user_id || (u as any)._id);
        return !memberUserIds.has(id) && !internsAlreadyAssigned.has(id);
      }),
    [internOptions, memberUserIds, internsAlreadyAssigned],
  );

  // ── form handlers ────────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setEditingBatch(null);
    setForm(emptyForm);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditModal = (batch: Batch) => {
    setEditingBatch(batch);
    setForm({
      name: batch.name,
      description: batch.description ?? '',
      start_date: toIsoDate(batch.start_date),
      end_date: toIsoDate(batch.end_date),
      supervisor_id: batch.supervisor_id ?? '',
      capacity: batch.capacity != null ? String(batch.capacity) : '',
      status_override: batch.status_override ?? '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (form.name.trim().length < 2) {
      setFormError('Name must be at least 2 characters.');
      return;
    }
    if (!form.start_date || !form.end_date) {
      setFormError('Start and end dates are required.');
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      setFormError('End date must be on or after start date.');
      return;
    }

    const payload: CreateBatchPayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      start_date: form.start_date,
      end_date: form.end_date,
      supervisor_id: form.supervisor_id || undefined,
      capacity: form.capacity ? Number(form.capacity) : undefined,
      status_override: form.status_override || null,
    };

    try {
      setIsSubmitting(true);
      if (editingBatch) {
        await batchService.update(editingBatch.batch_id, payload);
        setSuccessMsg('Batch updated.');
      } else {
        await batchService.create(payload);
        setSuccessMsg('Batch created.');
      }
      setIsFormOpen(false);
      await fetchBatches();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── members handlers ────────────────────────────────────────────────────────

  const openMembers = async (batch: Batch) => {
    setMembersModalBatch(batch);
    setMemberOpError('');
    setMemberToAddIds([]);
    setIsAddSectionOpen(false);
    setMembers([]);
    try {
      setMembersLoading(true);
      const items = await batchService.listMembers(batch.batch_id);
      setMembers(items);
    } catch (err: any) {
      setMemberOpError(err?.response?.data?.message || 'Failed to load members.');
    } finally {
      setMembersLoading(false);
    }
  };

  const addSelectedMembers = async () => {
    if (!membersModalBatch || memberToAddIds.length === 0) return;
    setMemberOpError('');
    try {
      const items = await batchService.addMembers(
        membersModalBatch.batch_id,
        memberToAddIds,
      );
      setMembers(items);
      setMemberToAddIds([]);
      setIsAddSectionOpen(false);
      await Promise.all([fetchBatches(), fetchAssignedIds()]);
    } catch (err: any) {
      setMemberOpError(err?.response?.data?.message || 'Failed to add members.');
    }
  };

  const removeMember = async (userId: string) => {
    if (!membersModalBatch) return;
    setMemberOpError('');
    try {
      await batchService.removeMember(membersModalBatch.batch_id, userId);
      setMembers((prev) => prev.filter((m) => String(m.user._id) !== userId));
      await Promise.all([fetchBatches(), fetchAssignedIds()]);
    } catch (err: any) {
      setMemberOpError(err?.response?.data?.message || 'Failed to remove member.');
    }
  };

  const updateMemberStatus = async (userId: string, status: BatchMemberStatus) => {
    if (!membersModalBatch) return;
    setMemberOpError('');
    try {
      const items = await batchService.updateMember(
        membersModalBatch.batch_id,
        userId,
        { status },
      );
      setMembers(items);
      await fetchBatches();
    } catch (err: any) {
      setMemberOpError(err?.response?.data?.message || 'Failed to update status.');
    }
  };

  // ── archive / restore ───────────────────────────────────────────────────────

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await batchService.archive(archiveTarget.batch_id);
      setArchiveTarget(null);
      setSuccessMsg('Batch archived.');
      await fetchBatches();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to archive batch.');
    }
  };

  const restore = async (batch: Batch) => {
    try {
      await batchService.restore(batch.batch_id);
      setSuccessMsg('Batch restored.');
      await fetchBatches();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to restore batch.');
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Internship Batches</h1>
          <p className="mt-1 text-sm text-slate-500">
            Group interns by batch or internship cycle.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreateModal}>
            <Plus className="mr-1 h-4 w-4" /> New Batch
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <WidgetSkeleton lines={4} />
          <WidgetSkeleton lines={4} />
        </div>
      ) : batches.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          No batches in this view.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {batches.map((batch) => (
            <Card key={batch.batch_id} className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{batch.name}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {toIsoDate(batch.start_date)} — {toIsoDate(batch.end_date)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    batch.is_archived
                      ? 'bg-slate-100 text-slate-600'
                      : batch.effective_status === 'Active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {batch.is_archived ? 'Archived' : batch.effective_status}
                </span>
              </div>

              {batch.description && (
                <p className="text-sm text-slate-600">{batch.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>Members: {batch.member_count}</span>
                {batch.capacity != null && <span>Capacity: {batch.capacity}</span>}
                {batch.status_override && (
                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">
                    Override: {batch.status_override}
                  </span>
                )}
              </div>

              {canManage && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="secondary" onClick={() => openMembers(batch)}>
                    <Users className="mr-1 h-4 w-4" /> Members
                  </Button>
                  <Button variant="outline" onClick={() => openEditModal(batch)}>
                    <Edit2 className="mr-1 h-4 w-4" /> Edit
                  </Button>
                  {batch.is_archived ? (
                    <Button variant="outline" onClick={() => restore(batch)}>
                      <RotateCcw className="mr-1 h-4 w-4" /> Restore
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setArchiveTarget(batch)}>
                      <Archive className="mr-1 h-4 w-4" /> Archive
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingBatch ? 'Edit Batch' : 'New Batch'}
      >
        <form onSubmit={submitForm} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Summer 2026 Cohort"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start date</label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">End date</label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Supervisor</label>
              <select
                value={form.supervisor_id}
                onChange={(e) => setForm((p) => ({ ...p, supervisor_id: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">— None —</option>
                {supervisorOptions.map((u) => (
                  <option key={String(u.user_id || (u as any)._id)} value={String(u.user_id || (u as any)._id)}>
                    {u.first_name} {u.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Capacity</label>
              <Input
                type="number"
                min={0}
                value={form.capacity}
                onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                placeholder="Unlimited"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status override</label>
            <select
              value={form.status_override}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  status_override: e.target.value as '' | BatchStatusOverride,
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Use dates (auto)</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              When set, this overrides the date-derived status.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editingBatch ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MEMBERS MODAL */}
      <Modal
        open={!!membersModalBatch}
        onClose={() => setMembersModalBatch(null)}
        title={membersModalBatch ? `Members — ${membersModalBatch.name}` : ''}
        className="max-w-3xl"
      >
        <div className="space-y-4">
          {memberOpError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {memberOpError}
            </div>
          )}

          {!isAddSectionOpen ? (
            <div className="flex justify-end">
              <Button onClick={() => setIsAddSectionOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Add intern
              </Button>
            </div>
          ) : (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Add interns</h3>
              <select
                multiple
                value={memberToAddIds}
                onChange={(e) =>
                  setMemberToAddIds(Array.from(e.target.selectedOptions).map((o) => o.value))
                }
                className="h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {internsAvailable.map((u) => {
                  const id = String(u.user_id || (u as any)._id);
                  return (
                    <option key={id} value={id}>
                      {u.first_name} {u.last_name} ({u.email})
                    </option>
                  );
                })}
              </select>
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddSectionOpen(false);
                    setMemberToAddIds([]);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={addSelectedMembers} disabled={memberToAddIds.length === 0}>
                  Add selected
                </Button>
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">
              Current members ({members.length})
            </h3>
            {membersLoading ? (
              <WidgetSkeleton lines={3} />
            ) : members.length === 0 ? (
              <p className="text-sm text-slate-500">No interns assigned yet.</p>
            ) : (
              <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
                {members.map((m) => {
                  const statusClass =
                    m.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : m.status === 'Completed'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-200 text-slate-700';
                  return (
                    <li key={m.assignment_id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {m.user.first_name} {m.user.last_name}
                        </p>
                        <p className="truncate text-xs text-slate-500">{m.user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                          {m.status}
                        </span>
                        <select
                          value={m.status}
                          onChange={(e) =>
                            updateMemberStatus(
                              String(m.user._id),
                              e.target.value as BatchMemberStatus,
                            )
                          }
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="Active">Active</option>
                          <option value="Completed">Completed</option>
                          <option value="Withdrawn">Withdrawn</option>
                        </select>
                        <Button variant="outline" onClick={() => removeMember(String(m.user._id))}>
                          Remove
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </Modal>

      {/* ARCHIVE CONFIRM */}
      <Modal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        title="Archive batch?"
      >
        <p className="text-sm text-slate-600">
          Archived batches are hidden from active and completed lists but their history is preserved.
          You can restore them later.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setArchiveTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmArchive}>
            Archive
          </Button>
        </div>
      </Modal>
    </div>
  );
}
