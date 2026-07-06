// frontend/src/features/offboarding/OffboardingPage.tsx
// Data-provider entry point for the /offboarding route.
//
// Responsibilities (unchanged from before):
//   • Auth guard + mount safety
//   • Role flag derivation
//   • Data fetching (drive links + eligible tasks)
//   • All event handlers (submit, review, copy, toast)
//
// Rendering is fully delegated to <OffboardingDashboard />, which owns
// the hub layout, tab navigation, and panel composition.

import { useCallback, useEffect, useState } from 'react';
import { taskService } from '../../services/taskService';
import { useAuthStore } from '../../store/authStore';
import type { OffboardingDriveLink, Task, TaskStatus } from '../../types/task';
import OffboardingDashboard, { type ToastItem } from './OffboardingDashboard';

export default function OffboardingPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser     = useAuthStore((state) => state.user);
  const currentUserId   = String(
    currentUser?.user_id || (currentUser as any)?._id || '',
  );

  // ── Local state ──────────────────────────────────────────────────────────
  const [mounted, setMounted]           = useState(false);
  const [links, setLinks]               = useState<OffboardingDriveLink[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [eligibleTasks, setEligible]    = useState<Pick<Task, 'task_id' | 'title'>[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [reviewingId, setReviewingId]   = useState<string | null>(null);
  const [copiedId, setCopiedId]         = useState<string | null>(null);
  const [toasts, setToasts]             = useState<ToastItem[]>([]);

  // ── Role flags ───────────────────────────────────────────────────────────
  const isSuperadmin      = currentUser?.global_role === 'Superadmin';
  const isAdmin           = currentUser?.global_role === 'Admin';
  const departmentRole    = currentUser?.departments?.[0]?.department_role;
  const isHeadOrSupervisor =
    departmentRole === 'Head' || departmentRole === 'Supervisor';
  const isIntern = departmentRole === 'Intern';

  // Supervisors, Heads, Admins, and Superadmins can review deliverables.
  const canReview = isSuperadmin || isAdmin || isHeadOrSupervisor;
  // Interns (and managers acting as assignees) can submit deliverables.
  const canSubmit = isIntern || isSuperadmin || isAdmin || isHeadOrSupervisor;

  const roleLabel = isSuperadmin
    ? 'Superadmin'
    : isAdmin
    ? 'Admin'
    : isHeadOrSupervisor
    ? 'Reviewer'
    : 'Intern';

  // ── Toast helper ─────────────────────────────────────────────────────────
  const pushToast = useCallback((message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, exiting: false }]);
    window.setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      );
    }, 2200);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await taskService.getOffboardingDriveLinks();
      setLinks(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Failed to load deliverable links.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /** Fetch tasks the intern can link a deliverable to (Under Review or Completed). */
  const fetchEligibleTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const all = await taskService.getTasks();
      const eligible = (all as (Task & { status: TaskStatus })[]).filter(
        (t) => t.status === 'Under Review' || t.status === 'Completed',
      );
      setEligible(eligible.map((t) => ({ task_id: t.task_id, title: t.title })));
    } catch {
      // Non-fatal; the task selector will simply be empty.
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    void fetchLinks();
    if (canSubmit) void fetchEligibleTasks();
  }, [canSubmit, fetchEligibleTasks, fetchLinks, isAuthenticated, mounted]);

  // ── Auth guard ───────────────────────────────────────────────────────────
  if (!mounted) return null;
  if (!isAuthenticated) {
    window.location.replace('/login');
    return null;
  }

  // ── Event handlers ───────────────────────────────────────────────────────
  const handleSubmit = async (taskId: string, url: string, label?: string) => {
    setSubmitting(true);
    setError('');
    try {
      await taskService.submitOffboardingDriveLink({ task_id: taskId, url, label });
      await fetchLinks();
      pushToast('Deliverable submitted ✓');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit deliverable.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (
    workLinkId: string,
    status: 'approved' | 'rejected',
    notes?: string,
  ) => {
    if (!canReview) return;
    setReviewingId(workLinkId);
    setError('');
    try {
      await taskService.reviewOffboardingDriveLink(workLinkId, {
        status,
        review_notes: notes,
      });
      await fetchLinks();
      pushToast(
        status === 'approved' ? 'Deliverable approved ✓' : 'Deliverable rejected',
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Failed to review deliverable.',
      );
    } finally {
      setReviewingId(null);
    }
  };

  const handleCopy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      pushToast('Link copied');
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1200);
    } catch {
      setError('Copy failed.');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <OffboardingDashboard
      // Role flags
      isSuperadmin={isSuperadmin}
      isAdmin={isAdmin}
      isHeadOrSupervisor={isHeadOrSupervisor}
      isIntern={isIntern}
      canReview={canReview}
      canSubmit={canSubmit}
      roleLabel={roleLabel}
      currentUserId={currentUserId}
      // Drive Links data
      links={links}
      loading={loading}
      error={error}
      eligibleTasks={eligibleTasks}
      tasksLoading={tasksLoading}
      submitting={submitting}
      reviewingId={reviewingId}
      copiedId={copiedId}
      toasts={toasts}
      // Handlers
      onSubmit={handleSubmit}
      onReview={handleReview}
      onCopy={handleCopy}
    />
  );
}
