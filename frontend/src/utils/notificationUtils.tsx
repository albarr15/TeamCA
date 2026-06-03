// frontend/src/utils/notificationUtils.tsx
// Shared rendering helpers for NotificationBell and NotificationsPage.
// All event-type-specific logic lives here so Bell and Page stay in sync.

import React from 'react';
import type { NotificationItem, NotificationEventType } from '../types/notification';

// ── href resolution ───────────────────────────────────────────────────────────

export const getNotificationHref = (item: NotificationItem): string => {
  const taskId =
    typeof item.metadata?.task_id === 'string' ? item.metadata.task_id : undefined;
  const leaveId =
    typeof item.metadata?.leaveId === 'string' ? item.metadata.leaveId : undefined;

  if (item.entity_type === 'task') {
    return taskId ? `/tasks?taskId=${encodeURIComponent(taskId)}` : '/tasks';
  }

  if (item.entity_type === 'leave') {
    // Deep-link to the leave section; leaveId is available but the UI
    // navigates to the leave list — keep it simple unless a detail route exists.
    return leaveId ? `/leave?leaveId=${encodeURIComponent(leaveId)}` : '/leave';
  }

  if (item.entity_type === 'user') {
    return '/users';
  }

  // DTR reminder events have no entity_type — send to DTR page
  if (
    item.event_type === 'dtr_clock_in_reminder' ||
    item.event_type === 'dtr_clock_out_reminder'
  ) {
    return '/dtr';
  }

  return '/notifications';
};

// ── quick-action label (NotificationsPage only) ───────────────────────────────

export const getQuickActionLabel = (item: NotificationItem): string | null => {
  if (item.entity_type === 'task') {
    if (item.event_type === 'task_deleted') return null;
    return 'View Task';
  }

  if (item.entity_type === 'leave') {
    return 'View Leave';
  }

  if (item.entity_type === 'user') {
    return 'View User';
  }

  if (
    item.event_type === 'dtr_clock_in_reminder' ||
    item.event_type === 'dtr_clock_out_reminder'
  ) {
    return 'Open DTR';
  }

  return null;
};

// ── icon SVGs ─────────────────────────────────────────────────────────────────

export const getNotificationIcon = (eventType: NotificationEventType, size: 'sm' | 'md' = 'sm') => {
  const cls = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  // Task deadline alerts
  if (eventType === 'task_overdue') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  }

  if (eventType === 'task_due_today') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    );
  }

  // Task deleted
  if (eventType === 'task_deleted') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  }

  // Task details updated
  if (eventType === 'task_details_updated') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
    );
  }

  // Task completed
  if (eventType === 'task_status_completed') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  }

  // Task under review
  if (eventType === 'task_status_under_review' || eventType === 'task_review_required') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z" />
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z" clipRule="evenodd" />
      </svg>
    );
  }

  // Deliverable reviewed (approved or rejected)
  if (eventType === 'task_deliverable_reviewed') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  }

  // Task status changed / moved back
  if (eventType === 'task_moved_back' || eventType === 'task_status_changed') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
      </svg>
    );
  }

  // Leave events
  if (
    eventType === 'leave_submitted' ||
    eventType === 'leave_approved' ||
    eventType === 'leave_rejected' ||
    eventType === 'leave_cancelled'
  ) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
      </svg>
    );
  }

  // DTR reminders
  if (eventType === 'dtr_clock_in_reminder' || eventType === 'dtr_clock_out_reminder') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    );
  }

  // User / profile events
  if (
    eventType === 'user_profile_updated' ||
    eventType === 'user_role_changed' ||
    eventType === 'user_activation_changed' ||
    eventType === 'user_deleted' ||
    eventType === 'intern_profile_updated'
  ) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    );
  }

  // Task comment / feedback
  if (eventType === 'task_comment_created' || eventType === 'task_feedback_added') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
      </svg>
    );
  }

  // Task assignment events
  if (
    eventType === 'task_assignment_added' ||
    eventType === 'task_assignment_removed' ||
    eventType === 'task_reassigned'
  ) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
      </svg>
    );
  }

  // Default bell
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
    </svg>
  );
};

// ── icon container colour ─────────────────────────────────────────────────────

export const getNotificationIconStyle = (
  eventType: NotificationEventType,
  isRead: boolean,
): string => {
  if (!isRead) {
    if (eventType === 'task_overdue') return 'bg-rose-100 text-rose-600';
    if (eventType === 'task_due_today') return 'bg-amber-100 text-amber-600';
    if (eventType === 'task_deleted') return 'bg-red-100 text-red-500';
    if (eventType === 'task_status_completed') return 'bg-green-100 text-green-600';
    if (eventType === 'task_status_under_review' || eventType === 'task_review_required')
      return 'bg-amber-100 text-amber-600';
    if (eventType === 'task_deliverable_reviewed') return 'bg-green-100 text-green-600';
    if (eventType === 'task_details_updated') return 'bg-violet-100 text-violet-600';
    if (eventType === 'task_moved_back' || eventType === 'task_status_changed')
      return 'bg-blue-100 text-blue-600';
    if (eventType === 'leave_approved') return 'bg-green-100 text-green-600';
    if (eventType === 'leave_rejected') return 'bg-red-100 text-red-500';
    if (eventType === 'leave_submitted' || eventType === 'leave_cancelled')
      return 'bg-amber-100 text-amber-600';
    if (eventType === 'dtr_clock_in_reminder' || eventType === 'dtr_clock_out_reminder')
      return 'bg-cyan-100 text-cyan-600';
    if (
      eventType === 'user_activation_changed' ||
      eventType === 'user_role_changed' ||
      eventType === 'user_profile_updated' ||
      eventType === 'intern_profile_updated'
    )
      return 'bg-indigo-100 text-indigo-600';
    if (eventType === 'user_deleted') return 'bg-red-100 text-red-500';
    return 'bg-blue-100 text-blue-600';
  }

  // Read state — muted tones
  if (eventType === 'task_overdue') return 'bg-rose-50 text-rose-400';
  if (eventType === 'task_due_today') return 'bg-amber-50 text-amber-400';
  if (eventType === 'task_deleted') return 'bg-slate-100 text-slate-400';
  if (eventType === 'task_status_completed') return 'bg-green-50 text-green-400';
  if (eventType === 'task_status_under_review' || eventType === 'task_review_required')
    return 'bg-amber-50 text-amber-400';
  if (eventType === 'task_deliverable_reviewed') return 'bg-green-50 text-green-400';
  if (eventType === 'task_details_updated') return 'bg-violet-50 text-violet-400';
  if (eventType === 'task_moved_back' || eventType === 'task_status_changed')
    return 'bg-slate-100 text-slate-400';
  if (eventType === 'leave_approved') return 'bg-green-50 text-green-400';
  if (eventType === 'leave_rejected') return 'bg-red-50 text-red-400';
  if (eventType === 'leave_submitted' || eventType === 'leave_cancelled')
    return 'bg-amber-50 text-amber-400';
  if (eventType === 'dtr_clock_in_reminder' || eventType === 'dtr_clock_out_reminder')
    return 'bg-cyan-50 text-cyan-400';
  if (
    eventType === 'user_activation_changed' ||
    eventType === 'user_role_changed' ||
    eventType === 'user_profile_updated' ||
    eventType === 'intern_profile_updated'
  )
    return 'bg-indigo-50 text-indigo-400';
  if (eventType === 'user_deleted') return 'bg-slate-100 text-slate-400';
  return 'bg-slate-100 text-slate-400';
};

// ── metadata helpers ──────────────────────────────────────────────────────────

const metaString = (
  item: { metadata?: Record<string, unknown> },
  key: string,
): string | null => {
  const value = item.metadata?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const changedFields = (item: { metadata?: Record<string, unknown> }): string[] => {
  const value = item.metadata?.changed_fields;
  if (!Array.isArray(value)) return [];
  return value
    .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
    .map((f) => f.replace(/_/g, ' ').trim());
};

// ── status badge ──────────────────────────────────────────────────────────────

const statusBadgeClass = (status: string): string => {
  if (status === 'Completed') return 'border-green-200 bg-green-50 text-green-700';
  if (status === 'Under Review') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'In Progress') return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass(status)}`}>
    {status}
  </span>
);

// ── detail renderer ───────────────────────────────────────────────────────────

export const renderNotificationDetail = (
  item: NotificationItem,
  textSize: 'xs' | 'sm' = 'xs',
): React.ReactNode => {
  const cls = `mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-${textSize} text-slate-600`;
  const plainCls = `mt-1 text-${textSize} text-slate-600`;

  const taskTitle = metaString(item, 'task_title');
  const taskStatus = metaString(item, 'task_status');
  const actorFirstName = metaString(item, 'actor_first_name') ?? 'Someone';
  const previousStatus = metaString(item, 'previous_status');
  const newStatus = metaString(item, 'new_status') ?? taskStatus;
  const fields = changedFields(item);

  // ── task events ────────────────────────────────────────────────────────────

  if (item.event_type === 'task_details_updated' && taskTitle) {
    return (
      <p className={cls}>
        <span>{actorFirstName}</span>
        <span>updated</span>
        {fields.length > 0
          ? fields.map((field) => (
              <span key={`field-${field}`} className="rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                {field}
              </span>
            ))
          : <span>task details</span>}
        <span>for</span>
        <span className="font-semibold text-slate-800">"{taskTitle}"</span>
        <span>.</span>
      </p>
    );
  }

  if (item.event_type === 'task_deleted' && taskTitle) {
    return (
      <p className={cls}>
        <span>{actorFirstName}</span>
        <span>deleted</span>
        <span className="font-semibold text-slate-800">"{taskTitle}"</span>
        {taskStatus ? (
          <>
            <span>with status</span>
            <StatusBadge status={taskStatus} />
          </>
        ) : null}
        <span>.</span>
      </p>
    );
  }

  if (item.event_type === 'task_due_today' && taskTitle) {
    return (
      <p className={cls}>
        <span>Make sure to submit your work on</span>
        <span className="font-semibold text-slate-800">"{taskTitle}"</span>
        <span>for reviewing.</span>
      </p>
    );
  }

  if (item.event_type === 'task_overdue' && taskTitle) {
    return (
      <p className={cls}>
        <span>Please accomplish</span>
        <span className="font-semibold text-slate-800">"{taskTitle}"</span>
        <span>at your earliest convenience.</span>
      </p>
    );
  }

  const isStatusEvent =
    item.event_type === 'task_moved_back' ||
    item.event_type === 'task_status_changed' ||
    item.event_type === 'task_status_under_review' ||
    item.event_type === 'task_status_completed';

  if (isStatusEvent && taskTitle && newStatus) {
    return (
      <p className={cls}>
        <span>{actorFirstName}</span>
        {item.event_type === 'task_moved_back' && previousStatus
          ? <span>moved</span>
          : <span>changed status of</span>}
        <span className="font-semibold text-slate-800">"{taskTitle}"</span>
        {item.event_type === 'task_moved_back' && previousStatus ? (
          <>
            <span>back from</span>
            <StatusBadge status={previousStatus} />
            <span>to</span>
          </>
        ) : (
          <span>to</span>
        )}
        <StatusBadge status={newStatus} />
        <span>.</span>
      </p>
    );
  }

  // ── leave events ───────────────────────────────────────────────────────────

  const reviewerName = metaString(item, 'reviewerName');
  const applicantName = metaString(item, 'applicantName');
  const rejectionReason = metaString(item, 'rejectionReason');

  if (item.event_type === 'leave_submitted') {
    return (
      <p className={cls}>
        {applicantName
          ? <span className="font-semibold text-slate-800">{applicantName}</span>
          : <span>A team member</span>}
        <span>submitted a leave request.</span>
      </p>
    );
  }

  if (item.event_type === 'leave_approved') {
    return (
      <p className={cls}>
        <span>Approved</span>
        {reviewerName ? (
          <>
            <span>by</span>
            <span className="font-semibold text-slate-800">{reviewerName}</span>
          </>
        ) : null}
        <span>.</span>
      </p>
    );
  }

  if (item.event_type === 'leave_rejected') {
    return (
      <p className={cls}>
        <span>Rejected</span>
        {reviewerName ? (
          <>
            <span>by</span>
            <span className="font-semibold text-slate-800">{reviewerName}</span>
          </>
        ) : null}
        {rejectionReason ? (
          <>
            <span>—</span>
            <span className="italic text-slate-500">{rejectionReason}</span>
          </>
        ) : null}
      </p>
    );
  }

  if (item.event_type === 'leave_cancelled') {
    return (
      <p className={cls}>
        {applicantName
          ? <span className="font-semibold text-slate-800">{applicantName}</span>
          : <span>A team member</span>}
        <span>cancelled their leave request.</span>
      </p>
    );
  }

  // ── DTR events ─────────────────────────────────────────────────────────────

  if (item.event_type === 'dtr_clock_in_reminder') {
    return <p className={plainCls}>Don't forget to clock in for today.</p>;
  }

  if (item.event_type === 'dtr_clock_out_reminder') {
    return <p className={plainCls}>Don't forget to clock out before leaving.</p>;
  }

  // ── user / profile events ──────────────────────────────────────────────────

  const userId = metaString(item, 'user_id');

  if (item.event_type === 'user_profile_updated') {
    return (
      <p className={plainCls}>
        {userId ? 'A user\'s' : 'Your'} profile information was updated.
      </p>
    );
  }

  if (item.event_type === 'user_role_changed') {
    const prevRole = metaString(item, 'previous_global_role');
    const nextRole = metaString(item, 'new_global_role');
    if (prevRole && nextRole) {
      return (
        <p className={cls}>
          <span>Role changed from</span>
          <span className="font-semibold text-slate-800">{prevRole.replace(/_/g, ' ')}</span>
          <span>to</span>
          <span className="font-semibold text-slate-800">{nextRole.replace(/_/g, ' ')}</span>
          <span>.</span>
        </p>
      );
    }
    return <p className={plainCls}>Your role assignment was updated.</p>;
  }

  if (item.event_type === 'user_activation_changed') {
    const newActive = item.metadata?.new_is_active;
    const state = newActive === true ? 'activated' : newActive === false ? 'deactivated' : null;
    return (
      <p className={plainCls}>
        {state ? `Account was ${state}.` : 'Account activation status changed.'}
      </p>
    );
  }

  if (item.event_type === 'user_deleted') {
    return <p className={plainCls}>The user account has been removed.</p>;
  }

  if (item.event_type === 'intern_profile_updated') {
    return <p className={plainCls}>Internship profile details were updated.</p>;
  }

  // ── task assignment events ─────────────────────────────────────────────────

  if (item.event_type === 'task_assignment_added' && taskTitle) {
    return (
      <p className={cls}>
        <span>You were assigned to</span>
        <span className="font-semibold text-slate-800">"{taskTitle}"</span>
        <span>.</span>
      </p>
    );
  }

  if (item.event_type === 'task_assignment_removed' && taskTitle) {
    return (
      <p className={cls}>
        <span>You were removed from</span>
        <span className="font-semibold text-slate-800">"{taskTitle}"</span>
        <span>.</span>
      </p>
    );
  }

  if (item.event_type === 'task_reassigned' && taskTitle) {
    return (
      <p className={cls}>
        <span>Assignees were updated for</span>
        <span className="font-semibold text-slate-800">"{taskTitle}"</span>
        <span>.</span>
      </p>
    );
  }

  // ── task comment / feedback ────────────────────────────────────────────────

  if (item.event_type === 'task_comment_created' || item.event_type === 'task_feedback_added') {
    return <p className={plainCls}>{item.message}</p>;
  }

  // ── deliverable reviewed ───────────────────────────────────────────────────

  if (item.event_type === 'task_deliverable_reviewed') {
    const reviewStatus = metaString(item, 'review_status');
    const isApproved = reviewStatus === 'approved';
    return (
      <p className={cls}>
        <span>Your deliverable link for</span>
        {taskTitle ? <span className="font-semibold text-slate-800">"{taskTitle}"</span> : null}
        <span>was</span>
        <span
          className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
            isApproved
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {isApproved ? 'Approved' : 'Rejected'}
        </span>
        <span>.</span>
      </p>
    );
  }

  // ── generic fallback ───────────────────────────────────────────────────────

  if (!taskTitle && !taskStatus) {
    return <p className={plainCls}>{item.message}</p>;
  }

  return (
    <p className={cls}>
      {taskTitle ? <span className="font-semibold text-slate-800">"{taskTitle}"</span> : null}
      {taskStatus ? <StatusBadge status={taskStatus} /> : null}
      <span>{item.message}</span>
    </p>
  );
};

// ── date grouping ─────────────────────────────────────────────────────────────

export type DateGroup = 'Today' | 'Yesterday' | 'Earlier';

export const getDateGroup = (createdAt: Date | string): DateGroup => {
  const now = new Date();
  const date = new Date(createdAt);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  if (date >= todayStart) return 'Today';
  if (date >= yesterdayStart) return 'Yesterday';
  return 'Earlier';
};

export const groupNotificationsByDate = <T extends { created_at: Date | string }>(
  items: T[],
): { group: DateGroup; items: T[] }[] => {
  const groups: Record<DateGroup, T[]> = { Today: [], Yesterday: [], Earlier: [] };
  for (const item of items) {
    groups[getDateGroup(item.created_at)].push(item);
  }
  return (['Today', 'Yesterday', 'Earlier'] as DateGroup[])
    .filter((g) => groups[g].length > 0)
    .map((g) => ({ group: g, items: groups[g] }));
};