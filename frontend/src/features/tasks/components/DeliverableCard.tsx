import { useState } from 'react';
import type { DeliverablePlatform, DeliverableStatus, TaskWorkLink } from '../../../types/task';
import Button from '../../../components/ui/Button';
import { PLATFORM_LABELS } from '../../../utils/deliverableUtils';

// ---------------------------------------------------------------------------
// Platform icons (inline SVGs — no external icon lib)
// ---------------------------------------------------------------------------
const PlatformIcon = ({ platform }: { platform: DeliverablePlatform }) => {
  const cls = 'h-3.5 w-3.5 shrink-0';
  switch (platform) {
    case 'github':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      );
    case 'figma':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.354-3.019-3.019-3.019h-3.117V7.51zm0 1.471H8.148c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.981zm-4.587-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.019 3.019 3.019h3.117V1.471H8.148zm4.587 15.019H8.148c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98zM8.148 10.48c-1.665 0-3.019 1.354-3.019 3.019s1.354 3.019 3.019 3.019h3.117v-6.038H8.148zm8.979 0c-2.476 0-4.49 2.014-4.49 4.49s2.014 4.49 4.49 4.49 4.49-2.014 4.49-4.49-2.014-4.49-4.49-4.49z" />
        </svg>
      );
    case 'drive':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M4.433 22.396l2.083-3.607H21.9l-2.083 3.607H4.433zm5.55-6.26L6.9 22.396H2.1L8.767 10.73l3.083 5.407h-1.867zm3.883-6.697L8.767 19.107 5.683 13.7 10.983 4.49l3.083 5.407-1.2 2.06zM21.9 22.396h-4.8L10.434 10.73 13.517 5.32 21.9 22.396z" />
        </svg>
      );
    case 'vercel':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M24 22.525H0l12-21.05 12 21.05z" />
        </svg>
      );
    case 'notion':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}>
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      );
  }
};

// ---------------------------------------------------------------------------
// Status badge (same pattern as the existing StatusBadge in notificationUtils)
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<DeliverableStatus, { label: string; cls: string }> = {
  pending_review: {
    label: 'Pending Review',
    cls: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  approved: {
    label: 'Approved',
    cls: 'border-green-200 bg-green-50 text-green-700',
  },
  rejected: {
    label: 'Rejected',
    cls: 'border-red-200 bg-red-50 text-red-700',
  },
};

// Colour tokens per platform (used for the chip border / background tint)
const PLATFORM_STYLE: Record<
  DeliverablePlatform,
  { text: string; border: string; bg: string }
> = {
  github: { text: 'text-slate-800', border: 'border-slate-300', bg: 'bg-slate-50' },
  figma: { text: 'text-orange-700', border: 'border-orange-200', bg: 'bg-orange-50' },
  drive: { text: 'text-blue-700', border: 'border-blue-200', bg: 'bg-blue-50' },
  vercel: { text: 'text-slate-900', border: 'border-slate-300', bg: 'bg-slate-50' },
  notion: { text: 'text-stone-700', border: 'border-stone-200', bg: 'bg-stone-50' },
  other: { text: 'text-slate-600', border: 'border-slate-200', bg: 'bg-slate-50' },
};

// ---------------------------------------------------------------------------
// Card outer border per status
// ---------------------------------------------------------------------------
const CARD_STATUS_CLS: Record<DeliverableStatus, string> = {
  pending_review: 'border-slate-200 bg-white',
  approved: 'border-green-200 bg-green-50/40',
  rejected: 'border-red-200 bg-red-50/40',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
type DeliverableCardProps = {
  link: TaskWorkLink;
  currentUserId: string;
  canDeleteAny: boolean;
  canDeleteOwn: boolean;
  canReview: boolean;
  deletingId: string | null;
  copiedId: string | null;
  reviewingId: string | null;
  onDelete: (id: string) => void;
  onCopy: (id: string, url: string) => void;
  onReview: (id: string, status: 'approved' | 'rejected', notes?: string) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DeliverableCard({
  link,
  currentUserId,
  canDeleteAny,
  canDeleteOwn,
  canReview,
  deletingId,
  copiedId,
  reviewingId,
  onDelete,
  onCopy,
  onReview,
}: DeliverableCardProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectError, setRejectError] = useState('');

  const platform = link.platform ?? 'other';
  const status = link.status ?? 'pending_review';

  const isDeleting = deletingId === link.work_link_id;
  const isCopied = copiedId === link.work_link_id;
  const isReviewing = reviewingId === link.work_link_id;
  const canDelete = canDeleteAny || (canDeleteOwn && link.submitted_by === currentUserId);

  const { label: statusLabel, cls: statusCls } = STATUS_CONFIG[status];
  const { text: platformText, border: platformBorder, bg: platformBg } = PLATFORM_STYLE[platform];

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
      className={`rounded-xl border p-3.5 transition-shadow hover:shadow-sm ${CARD_STATUS_CLS[status]}`}
    >
      {/* Header: platform chip + status badge */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold
            ${platformText} ${platformBorder} ${platformBg}`}
        >
          <PlatformIcon platform={platform} />
          {PLATFORM_LABELS[platform]}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusCls}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* URL */}
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer noopener"
        className="block break-all text-sm text-blue-600 underline hover:text-blue-800"
      >
        {link.label?.trim() || link.url}
      </a>

      {/* Rejection notes */}
      {status === 'rejected' && link.review_notes && (
        <div className="mt-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-[11px] font-semibold text-red-700">Feedback from reviewer</p>
          <p className="mt-0.5 whitespace-pre-wrap text-xs text-red-800">{link.review_notes}</p>
        </div>
      )}

      {/* Action row */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {/* Copy — ghost style, matches existing action button pattern */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onCopy(link.work_link_id, link.url)}
        >
          {isCopied ? '✓ Copied' : 'Copy'}
        </Button>

        {/* Delete */}
        {canDelete && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            loading={isDeleting}
            onClick={() => onDelete(link.work_link_id)}
          >
            Delete
          </Button>
        )}

        {/* Supervisor review actions — only shown when pending */}
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
              ✓ Approve
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isReviewing}
              className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              onClick={() => setRejectOpen((p) => !p)}
            >
              ✗ Reject
            </Button>
          </>
        )}

        {/* Re-reject an approved deliverable */}
        {canReview && status === 'approved' && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isReviewing}
            className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            onClick={() => setRejectOpen((p) => !p)}
          >
            ✗ Reject
          </Button>
        )}

        {/* Re-approve a rejected deliverable */}
        {canReview && status === 'rejected' && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={isReviewing}
            className="border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
            onClick={() => onReview(link.work_link_id, 'approved')}
          >
            ✓ Approve
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
            placeholder="Tell the intern what needs to be fixed…"
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
