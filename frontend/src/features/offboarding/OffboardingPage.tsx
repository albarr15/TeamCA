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
import { internProfileService } from '../../services/internProfileService';
import { extensionService } from '../../services/extensionService';
import { useAuthStore } from '../../store/authStore';
import type { OffboardingDriveLink, Task, TaskStatus } from '../../types/task';
import type { InternProfile } from '../../types/user';
import type { ExtensionRequest } from '../../types/extension';
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

  // ── Exit Checklist state (Internship Exit Requirement Tracker) ────────────
  const [allTasks, setAllTasks]                 = useState<Task[]>([]);
  const [internProfile, setInternProfile]       = useState<InternProfile | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistError, setChecklistError]     = useState('');

  // ── Extension Request state ────────────────────────────────────────────────
  const [myExtensionRequests, setMyExtensionRequests]     = useState<ExtensionRequest[]>([]);
  const [pendingExtensions, setPendingExtensions]         = useState<ExtensionRequest[]>([]);
  const [extensionsLoading, setExtensionsLoading]         = useState(false);
  const [extensionsError, setExtensionsError]             = useState('');
  const [extensionSubmitting, setExtensionSubmitting]     = useState(false);
  const [extensionReviewingId, setExtensionReviewingId]   = useState<string | null>(null);

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
        (t) => t.status === 'In Progress' || t.status === 'Under Review',
      );
      setEligible(eligible.map((t) => ({ task_id: t.task_id, title: t.title })));
    } catch {
      // Non-fatal; the task selector will simply be empty.
    } finally {
      setTasksLoading(false);
    }
  }, []);

  /** Fetch data backing the "Exit Checklist" tab: the intern's own tasks and profile hours. */
  const fetchChecklistData = useCallback(async () => {
    if (!currentUserId) return;
    setChecklistLoading(true);
    setChecklistError('');
    try {
      const [tasks, profile] = await Promise.all([
        taskService.getTasks(),
        internProfileService.getInternProfileByUserId(currentUserId),
      ]);
      setAllTasks(tasks as Task[]);
      setInternProfile(profile);
    } catch (err: any) {
      setChecklistError(
        err?.response?.data?.message || 'Failed to load exit requirements.',
      );
    } finally {
      setChecklistLoading(false);
    }
  }, [currentUserId]);

  /** Fetch data backing the "Extension Request" tab: own history and/or the reviewer queue. */
  const fetchExtensionRequests = useCallback(async () => {
    setExtensionsLoading(true);
    setExtensionsError('');
    try {
      const [mine, pending] = await Promise.all([
        isIntern ? extensionService.getMyExtensionRequests() : Promise.resolve([]),
        canReview ? extensionService.getPendingExtensionRequests() : Promise.resolve([]),
      ]);
      setMyExtensionRequests(mine);
      setPendingExtensions(pending);
    } catch (err: any) {
      setExtensionsError(
        err?.response?.data?.message || 'Failed to load extension requests.',
      );
    } finally {
      setExtensionsLoading(false);
    }
  }, [canReview, isIntern]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    void fetchLinks();
    if (canSubmit) void fetchEligibleTasks();
    if (isIntern) void fetchChecklistData();
    if (isIntern || canReview) void fetchExtensionRequests();
  }, [
    canReview,
    canSubmit,
    fetchChecklistData,
    fetchEligibleTasks,
    fetchExtensionRequests,
    fetchLinks,
    isAuthenticated,
    isIntern,
    mounted,
  ]);

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
    status: 'approved' | 'rejected' | 'revision_requested',
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
        status === 'approved'
          ? 'Deliverable approved ✓'
          : status === 'rejected'
            ? 'Deliverable rejected'
            : 'Revision requested',
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

  const handleSubmitExtension = async (additionalHours: number, reason: string) => {
    setExtensionSubmitting(true);
    setExtensionsError('');
    try {
      await extensionService.submitExtensionRequest({
        additional_hours: additionalHours,
        reason,
      });
      await fetchExtensionRequests();
      pushToast('Extension request submitted ✓');
    } catch (err: any) {
      setExtensionsError(
        err?.response?.data?.message || 'Failed to submit extension request.',
      );
    } finally {
      setExtensionSubmitting(false);
    }
  };

  const handleCancelExtension = async (requestId: string) => {
    setExtensionReviewingId(requestId);
    setExtensionsError('');
    try {
      await extensionService.cancelExtensionRequest(requestId);
      await fetchExtensionRequests();
      pushToast('Extension request cancelled');
    } catch (err: any) {
      setExtensionsError(
        err?.response?.data?.message || 'Failed to cancel extension request.',
      );
    } finally {
      setExtensionReviewingId(null);
    }
  };

  const handleReviewExtension = async (
    requestId: string,
    status: 'approved' | 'rejected',
    remarks?: string,
  ) => {
    if (!canReview) return;
    setExtensionReviewingId(requestId);
    setExtensionsError('');
    try {
      await extensionService.reviewExtensionRequest(requestId, { status, remarks });
      await fetchExtensionRequests();
      pushToast(status === 'approved' ? 'Extension approved ✓' : 'Extension rejected');
    } catch (err: any) {
      setExtensionsError(
        err?.response?.data?.message || 'Failed to review extension request.',
      );
    } finally {
      setExtensionReviewingId(null);
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
      // Exit Checklist data
      allTasks={allTasks}
      internProfile={internProfile}
      checklistLoading={checklistLoading}
      checklistError={checklistError}
      // Extension Request data
      myExtensionRequests={myExtensionRequests}
      pendingExtensions={pendingExtensions}
      extensionsLoading={extensionsLoading}
      extensionsError={extensionsError}
      extensionSubmitting={extensionSubmitting}
      extensionReviewingId={extensionReviewingId}
      // Handlers
      onSubmit={handleSubmit}
      onReview={handleReview}
      onCopy={handleCopy}
      onSubmitExtension={handleSubmitExtension}
      onCancelExtension={handleCancelExtension}
      onReviewExtension={handleReviewExtension}
    />
  );
}