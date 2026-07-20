// frontend/src/features/offboarding/components/RequirementStatusChip.tsx
// Presentational status chip for Exit Requirement Tracker items.
// Mirrors the visual language of DriveLinkStatusBadge for consistency
// across the Offboarding Hub, extended with a "completed" variant.

import type { RequirementStatus } from '../utils/exitRequirements';

type Config = { label: string; cls: string };

const STATUS_CONFIG: Record<RequirementStatus, Config> = {
  pending: {
    label: 'Pending',
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
  completed: {
    label: 'Completed',
    cls: 'border-blue-200 bg-blue-50 text-blue-700',
  },
};

type Props = { status: RequirementStatus; className?: string };

export default function RequirementStatusChip({ status, className = '' }: Props) {
  const { label, cls } = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls} ${className}`}
    >
      {status === 'completed' && <span aria-hidden="true">✓</span>}
      {status === 'approved' && <span aria-hidden="true">✓</span>}
      {status === 'rejected' && <span aria-hidden="true">✗</span>}
      {status === 'pending' && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400"
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}
