// frontend/src/features/offboarding/components/ExtensionRequestPanel.tsx
// Panel component for the "Extension Request" tab.
//
// Owns the display of:
//   • Error banner
//   • (Interns) a form to file a new extension request, plus their own
//     request history with status + full remarks/history log
//   • (Reviewers: Heads/Supervisors/Admins/Superadmins) the pending approval
//     queue, with approve/reject actions
//
// All data and handlers are received as props from OffboardingPage (data provider),
// mirroring the pattern used by DriveLinkPanel.

import { useState } from 'react';
import type { FormEvent } from 'react';
import type {
  ExtensionHistoryEntry,
  ExtensionRequest,
  ExtensionRequestStatus,
} from '../../../types/extension';

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ExtensionRequestStatus, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  approved: { label: 'Approved', cls: 'border-green-200 bg-green-50 text-green-700' },
  rejected: { label: 'Rejected', cls: 'border-red-200 bg-red-50 text-red-700' },
  cancelled: { label: 'Cancelled', cls: 'border-slate-200 bg-slate-100 text-slate-600' },
};

function StatusBadge({ status }: { status: ExtensionRequestStatus }) {
  const { label, cls } = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {status === 'approved' && <span aria-hidden="true">✓</span>}
      {status === 'rejected' && <span aria-hidden="true">✗</span>}
      {status === 'cancelled' && <span aria-hidden="true">–</span>}
      {status === 'pending' && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

// ── History log ──────────────────────────────────────────────────────────────

function HistoryLog({ history }: { history: ExtensionRequest['history'] }) {
  if (history.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
      {history.map((entry: ExtensionHistoryEntry, idx: number) => (
        <li key={idx} className="text-[11px] text-slate-500">
          <span className="font-medium text-slate-700">{entry.actor_name}</span>{' '}
          {entry.action} — {formatDate(entry.timestamp)}
          {entry.remarks && <span className="italic"> · “{entry.remarks}”</span>}
        </li>
      ))}
    </ul>
  );
}

// ── Request card ──────────────────────────────────────────────────────────────

function RequestCard({
  request,
  showCancel,
  onCancel,
}: {
  request: ExtensionRequest;
  showCancel: boolean;
  onCancel?: (requestId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-slate-900">
            +{request.additional_hours} hrs requested
          </h4>
          <StatusBadge status={request.status} />
        </div>
        {showCancel && request.status === 'pending' && onCancel && (
          <button
            type="button"
            onClick={() => onCancel(request.extension_request_id)}
            className="text-xs font-semibold text-red-600 hover:underline"
          >
            Cancel request
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {request.previous_required_hours} → {request.new_required_hours} required hours
      </p>
      <p className="mt-2 text-sm text-slate-700">{request.reason}</p>
      {request.status === 'rejected' && request.rejection_reason && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          Rejected: {request.rejection_reason}
        </p>
      )}
      <HistoryLog history={request.history} />
    </div>
  );
}

// ── Panel props ────────────────────────────────────────────────────────────

export interface ExtensionRequestPanelProps {
  isIntern: boolean;
  canReview: boolean;
  myRequests: ExtensionRequest[];
  pendingQueue: ExtensionRequest[];
  loading: boolean;
  error: string;
  submitting: boolean;
  reviewingId: string | null;
  onSubmit: (additionalHours: number, reason: string) => Promise<void>;
  onCancel: (requestId: string) => Promise<void>;
  onReview: (
    requestId: string,
    status: 'approved' | 'rejected',
    remarks?: string,
  ) => Promise<void>;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ExtensionRequestPanel({
  isIntern,
  canReview,
  myRequests,
  pendingQueue,
  loading,
  error,
  submitting,
  reviewingId,
  onSubmit,
  onCancel,
  onReview,
}: ExtensionRequestPanelProps) {
  const [additionalHours, setAdditionalHours] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [rejectDrafts, setRejectDrafts] = useState<Record<string, string>>({});

  const hasPendingOfMine = myRequests.some((r) => r.status === 'pending');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    const hours = Number(additionalHours);
    if (!additionalHours || Number.isNaN(hours) || hours < 1) {
      setFormError('Enter a valid number of additional hours (1 or more).');
      return;
    }
    if (reason.trim().length < 3) {
      setFormError('Please provide a brief reason (3+ characters).');
      return;
    }

    await onSubmit(hours, reason.trim());
    setAdditionalHours('');
    setReason('');
  };

  const handleReject = (requestId: string) => {
    const remarks = rejectDrafts[requestId]?.trim();
    if (!remarks) return;
    void onReview(requestId, 'rejected', remarks);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-500">
        Loading extension requests…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Intern: submission form ──────────────────────────────────── */}
      {isIntern && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold text-slate-900">Request an Extension</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Submit a request to add hours to your required internship duration.
          </p>

          {hasPendingOfMine ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              You already have a pending extension request. You can file a new one once it's
              resolved.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Additional hours needed
                </label>
                <input
                  type="number"
                  min={1}
                  value={additionalHours}
                  onChange={(e) => setAdditionalHours(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  placeholder="e.g. 40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  placeholder="Why do you need more time?"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Intern: own history ──────────────────────────────────────── */}
      {isIntern && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Your Requests</h3>
          {myRequests.length === 0 ? (
            <p className="text-xs text-slate-500">No extension requests filed yet.</p>
          ) : (
            <div className="space-y-3">
              {myRequests.map((r) => (
                <RequestCard
                  key={r.extension_request_id}
                  request={r}
                  showCancel
                  onCancel={onCancel}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Reviewer: pending approval queue ──────────────────────────── */}
      {canReview && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Pending Approvals</h3>
          {pendingQueue.length === 0 ? (
            <p className="text-xs text-slate-500">No pending extension requests.</p>
          ) : (
            <div className="space-y-3">
              {pendingQueue.map((r) => (
                <div key={r.extension_request_id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">
                      +{r.additional_hours} hrs requested
                    </h4>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {r.previous_required_hours} → {r.new_required_hours} required hours
                  </p>
                  <p className="mt-2 text-sm text-slate-700">{r.reason}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={reviewingId === r.extension_request_id}
                      onClick={() => void onReview(r.extension_request_id, 'approved')}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <input
                      type="text"
                      value={rejectDrafts[r.extension_request_id] ?? ''}
                      onChange={(e) =>
                        setRejectDrafts((prev) => ({
                          ...prev,
                          [r.extension_request_id]: e.target.value,
                        }))
                      }
                      placeholder="Reason for rejection…"
                      className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-slate-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={
                        reviewingId === r.extension_request_id ||
                        !rejectDrafts[r.extension_request_id]?.trim()
                      }
                      onClick={() => handleReject(r.extension_request_id)}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}