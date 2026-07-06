// frontend/src/features/offboarding/components/DriveLinkList.tsx
// Groups and renders the list of Google Drive deliverable links.
// When the reviewer (Supervisor/Head/Admin) is viewing, shows a summary banner
// of how many items are pending review. Groups links by status for clarity.

import type { DeliverableStatus, OffboardingDriveLink } from '../../../types/task';
import DriveLinkCard from './DriveLinkCard';

type DriveLinkListProps = {
  links: OffboardingDriveLink[];
  currentUserId: string;
  canReview: boolean;
  reviewingId: string | null;
  copiedId: string | null;
  onCopy: (id: string, url: string) => void;
  onReview: (id: string, status: 'approved' | 'rejected', notes?: string) => void;
};

const STATUS_ORDER: DeliverableStatus[] = ['pending_review', 'rejected', 'approved'];
const STATUS_SECTION_LABEL: Record<DeliverableStatus, string> = {
  pending_review: 'Pending Review',
  rejected: 'Needs Revision',
  approved: 'Approved',
};

export default function DriveLinkList({
  links,
  currentUserId,
  canReview,
  reviewingId,
  copiedId,
  onCopy,
  onReview,
}: DriveLinkListProps) {
  if (links.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mx-auto mb-3 h-10 w-10 text-slate-300"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <p className="text-sm font-medium text-slate-500">No Google Drive deliverables yet.</p>
        <p className="mt-1 text-xs text-slate-400">
          Deliverables will appear here once tasks reach "Under Review" or "Completed" status.
        </p>
      </div>
    );
  }

  const pendingCount = links.filter((l) => l.status === 'pending_review').length;

  // Group by status
  const grouped = STATUS_ORDER.reduce<Record<DeliverableStatus, OffboardingDriveLink[]>>(
    (acc, s) => {
      acc[s] = links.filter((l) => (l.status ?? 'pending_review') === s);
      return acc;
    },
    { pending_review: [], rejected: [], approved: [] },
  );

  return (
    <div className="space-y-6">
      {/* Reviewer summary banner */}
      {canReview && pendingCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="mt-0.5 text-base" aria-hidden="true">🔍</span>
          <span>
            <strong>{pendingCount}</strong>{' '}
            {pendingCount === 1 ? 'deliverable is' : 'deliverables are'} awaiting your review.
          </span>
        </div>
      )}

      {/* Sections by status */}
      {STATUS_ORDER.map((status) => {
        const sectionLinks = grouped[status];
        if (sectionLinks.length === 0) return null;
        return (
          <section key={status} aria-label={STATUS_SECTION_LABEL[status]}>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              {STATUS_SECTION_LABEL[status]}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {sectionLinks.length}
              </span>
            </h3>
            <div className="space-y-3">
              {sectionLinks.map((link) => (
                <DriveLinkCard
                  key={link.work_link_id}
                  link={link}
                  currentUserId={currentUserId}
                  canReview={canReview}
                  reviewingId={reviewingId}
                  copiedId={copiedId}
                  onCopy={onCopy}
                  onReview={onReview}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
