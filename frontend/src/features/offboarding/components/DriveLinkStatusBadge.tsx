// frontend/src/features/offboarding/components/DriveLinkStatusBadge.tsx
// Presentational badge for DeliverableStatus values.
// Aliases "pending_review" to "Pending Review" as agreed.

import type { DeliverableStatus } from '../../../types/task';

type Config = { label: string; cls: string };

const STATUS_CONFIG: Record<DeliverableStatus, Config> = {
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

type Props = { status: DeliverableStatus; className?: string };

export default function DriveLinkStatusBadge({ status, className = '' }: Props) {
  const { label, cls } = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_review;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls} ${className}`}
    >
      {status === 'approved' && <span aria-hidden="true">✓</span>}
      {status === 'rejected' && <span aria-hidden="true">✗</span>}
      {status === 'pending_review' && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400"
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}
