// frontend/src/features/offboarding/components/ClearanceTimelinePanel.tsx
// Displays the chronological "Clearance Approval Timeline" for an intern:
// every deliverable review, extension request decision, and the terminal
// offboarding clearance decision, newest first. Reviewers can pick which
// intern's timeline to view; interns always see their own.

import { useCallback, useEffect, useState } from 'react';
import { clearanceService } from '../../../services/clearanceService';
import { taskService } from '../../../services/taskService';
import type { ClearanceTimelineEntry } from '../../../types/clearance';
import type { OffboardingCandidate } from '../../../types/task';

type StatusFilter = 'all' | 'rejected' | 'revision_requested';

const ACTION_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  revision_requested: 'Revision Requested',
  cancelled: 'Cancelled',
};

const ACTION_BADGE_CLASS: Record<string, string> = {
  submitted: 'border-slate-200 bg-slate-50 text-slate-700',
  approved: 'border-green-200 bg-green-50 text-green-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  revision_requested: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  cancelled: 'border-amber-200 bg-amber-50 text-amber-700',
};

const CATEGORY_LABEL: Record<string, string> = {
  deliverable: 'Deliverable',
  extension: 'Extension Request',
  clearance: 'Offboarding Clearance',
};

function formatTimestamp(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface Props {
  isIntern: boolean;
  canReview: boolean;
  currentUserId: string;
}

export default function ClearanceTimelinePanel({ isIntern, canReview, currentUserId }: Props) {
  const [candidates, setCandidates] = useState<OffboardingCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [entries, setEntries] = useState<ClearanceTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Reviewers pick which intern's timeline to inspect from the candidate list.
  useEffect(() => {
    if (!canReview) return;
    let cancelled = false;
    setCandidatesLoading(true);
    taskService
      .getOffboardingCandidates()
      .then((data) => {
        if (cancelled) return;
        setCandidates(data);
        setSelectedUserId((prev) => prev || data[0]?.user_id || '');
      })
      .catch(() => {
        if (!cancelled) setCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setCandidatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canReview]);

  const targetUserId = isIntern ? currentUserId : selectedUserId;

  const fetchTimeline = useCallback(async () => {
    if (!targetUserId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const filter = statusFilter === 'all' ? undefined : { status: statusFilter };
      const data = isIntern
        ? await clearanceService.getMyClearanceTimeline(filter)
        : await clearanceService.getClearanceTimeline(targetUserId, filter);
      setEntries(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load clearance timeline.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [isIntern, statusFilter, targetUserId]);

  useEffect(() => {
    void fetchTimeline();
  }, [fetchTimeline]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Clearance approval timeline</h2>
          <p className="mt-1 text-sm text-slate-500">
            A chronological history of every clearance action — deliverable reviews, extension
            request decisions, and the final offboarding approval.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {canReview && !isIntern && (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={candidatesLoading || candidates.length === 0}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-60"
            >
              {candidates.length === 0 && <option value="">No interns available</option>}
              {candidates.map((candidate) => (
                <option key={candidate.user_id} value={candidate.user_id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All actions</option>
            <option value="rejected">Rejected only</option>
            <option value="revision_requested">Revision requests only</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="py-8 text-sm text-slate-500">Loading timeline…</p>
      ) : entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          {statusFilter === 'all'
            ? 'No clearance actions have been recorded yet.'
            : 'No actions match this filter.'}
        </p>
      ) : (
        <ol className="space-y-3 border-l border-slate-200 pl-5">
          {entries.map((entry) => (
            <li key={entry.id} className="relative">
              <span
                className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300"
                aria-hidden="true"
              />
              <article className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                      ACTION_BADGE_CLASS[entry.action] ?? 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    {ACTION_LABEL[entry.action] ?? entry.action}
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {CATEGORY_LABEL[entry.category] ?? entry.category}
                  </span>
                  {entry.context && (
                    <span className="text-xs text-slate-400">· {entry.context}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-800">
                  <span className="font-medium">{entry.actor_name}</span>{' '}
                  {entry.action === 'submitted' ? 'submitted this item' : `marked this ${ACTION_LABEL[entry.action]?.toLowerCase() ?? entry.action}`}
                </p>
                {entry.notes && <p className="mt-1 text-sm text-slate-600">"{entry.notes}"</p>}
                <p className="mt-2 text-xs text-slate-400">{formatTimestamp(entry.timestamp)}</p>
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}