// frontend/src/features/offboarding/components/DriveLinkCard.tsx
// Card displaying a single Google Drive deliverable link with its status,
// reviewer notes (when rejected), and inline approve/reject controls for supervisors.

import { useState } from 'react';
import type { DeliverableStatus, OffboardingDriveLink } from '../../../types/task';
import Button from '../../../components/ui/Button';
import DriveLinkStatusBadge from './DriveLinkStatusBadge';

// ---------------------------------------------------------------------------
// Card border + background per status (matches DeliverableCard conventions)
// ---------------------------------------------------------------------------
const CARD_STATUS_CLS: Record<DeliverableStatus, string> = {
  pending_review: 'border-slate-200 bg-white',
  approved: 'border-green-200 bg-green-50/40',
  rejected: 'border-red-200 bg-red-50/40',
  revision_requested: 'border-indigo-200 bg-indigo-50/40',
};

// ---------------------------------------------------------------------------
// Google Drive logo (inline SVG)
// ---------------------------------------------------------------------------
const DriveIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-blue-600">
    <path d="M4.433 22.396l2.083-3.607H21.9l-2.083 3.607H4.433zm5.55-6.26L6.9 22.396H2.1L8.767 10.73l3.083 5.407h-1.867zm3.883-6.697L8.767 19.107 5.683 13.7 10.983 4.49l3.083 5.407-1.2 2.06zM21.9 22.396h-4.8L10.434 10.73 13.517 5.32 21.9 22.396z" />
  </svg>
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
type DriveLinkCardProps = {
  link: OffboardingDriveLink;
  currentUserId: string;
  canReview: boolean;
  reviewingId: string | null;
  copiedId: string | null;
  onCopy: (id: string, url: string) => void;
  onReview: (id: string, status: 'approved' | 'rejected' | 'revision_requested', notes?: string) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DriveLinkCard({
  link,
  currentUserId,
  canReview,
  reviewingId,
  copiedId,
  onCopy,
  onReview,
}: DriveLinkCardProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectError, setRejectError] = useState('');

  const status = link.status ?? 'pending_review';
  const isReviewing = reviewingId === link.work_link_id;
  const isCopied = copiedId === link.work_link_id;
  const isOwn = link.submitted_by === currentUserId;

  const handleRejectSubmit = () => {
    if (!rejectNotes.trim()) {
      setRejectError('Rejection notes are required.');
      return;
    }
    setRejectError('');
    onReview(link.work_link_id, 'rejected', rejectNotes.trim());
    setRejectOpen(false);
    setRejectNotes('');
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-shadow hover:shadow-sm ${CARD_STATUS_CLS[status]}`}
    >
      {/* Header row */}
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <DriveIcon />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {link.task_title}
            </p>
            {link.label && (
              <p className="truncate text-sm font-medium text-slate-800">{link.label}</p>
            )}
          </div>
        </div>
        <DriveLinkStatusBadge status={status} />
      </div>

      {/* URL */}
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer noopener"
        className="block break-all text-sm text-blue-600 underline hover:text-blue-800 mb-2"
      >
        {link.url}
      </a>

      {/* Submission meta */}
      <p className="mb-2.5 text-[11px] text-slate-400">
        Submitted {isOwn ? 'by you' : ''} ·{' '}
        {new Date(link.created_at).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </p>

      {/* Reviewer notes – shown when rejected or revision requested */}
      {(status === 'rejected' || status === 'revision_requested') && link.review_notes && (
        <div
          className={`mb-3 rounded-lg border px-3 py-2 ${
            status === 'rejected'
              ? 'border-red-200 bg-red-50'
              : 'border-indigo-200 bg-indigo-50'
          }`}
        >
          <p
            className={`text-[11px] font-semibold ${
              status === 'rejected' ? 'text-red-700' : 'text-indigo-700'
            }`}
          >
            {status === 'rejected' ? 'Reviewer feedback' : 'Revision instructions'}
          </p>
          <p
            className={`mt-0.5 whitespace-pre-wrap text-xs ${
              status === 'rejected' ? 'text-red-800' : 'text-indigo-800'
            }`}
          >
            {link.review_notes}
          </p>
        </div>
      )}

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Copy */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onCopy(link.work_link_id, link.url)}
        >
          {isCopied ? <><span aria-hidden="true">✓</span> Copied</> : 'Copy link'}
        </Button>

        {/* Reviewer controls – pending */}
        {canReview && status === 'pending_review' && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={isReviewing}
              className="border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
              onClick={() => onReview(link.work_link_id, 'approved')}
            >
              <span aria-hidden="true">✓</span> Approve
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isReviewing}
              className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              onClick={() => setRejectOpen((p) => !p)}
            >
              <span aria-hidden="true">✗</span> Reject
            </Button>
          </>
        )}

        {/* Re-reject an approved link */}
        {canReview && status === 'approved' && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isReviewing}
            className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            onClick={() => setRejectOpen((p) => !p)}
          >
            <span aria-hidden="true">✗</span> Reject
          </Button>
        )}

        {/* Re-approve a rejected link */}
        {canReview && status === 'rejected' && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={isReviewing}
            className="border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
            onClick={() => onReview(link.work_link_id, 'approved')}
          >
            <span aria-hidden="true">✓</span> Approve
          </Button>
        )}
      </div>

      {/* Rejection notes panel */}
      {rejectOpen && (
        <div className="mt-3 border-t border-red-200 pt-3">
          <label className="mb-1.5 block text-xs font-semibold text-red-700">
            Rejection notes <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={rejectNotes}
            onChange={(e) => {
              setRejectNotes(e.target.value);
              setRejectError('');
            }}
            placeholder="Tell the intern what needs to be fixed or re-submitted…"
            className="w-full resize-y rounded-md border border-red-300 px-3 py-2 text-sm text-slate-900
              focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
          />
          {rejectError && (
            <p className="mt-1 text-xs text-red-600">{rejectError}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={isReviewing}
              onClick={handleRejectSubmit}
            >
              Confirm Reject
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectOpen(false);
                setRejectNotes('');
                setRejectError('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
