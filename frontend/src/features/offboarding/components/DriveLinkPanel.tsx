// frontend/src/features/offboarding/components/DriveLinkPanel.tsx
// Panel component for the "Drive Links" tab.
//
// Owns the display of:
//   • Error banner
//   • Stats summary cards (pending / approved / needs revision)
//   • DriveLinkForm (for interns + managers)
//   • DriveLinkList (for all roles)
//
// All data and handlers are received as props from OffboardingPage (data provider).

import React from 'react';
import type { OffboardingDriveLink, Task } from '../../../types/task';
import DriveLinkForm from './DriveLinkForm';
import DriveLinkList from './DriveLinkList';

// ── Stat card ──────────────────────────────────────────────────────────────

type StatCardProps = {
  label: string;
  count: number;
  colorCls: string;
  icon: React.ReactNode;
};

function StatCard({ label, count, colorCls, icon }: StatCardProps) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${colorCls}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/60">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{count}</p>
        <p className="mt-0.5 text-xs font-medium opacity-70">{label}</p>
      </div>
    </div>
  );
}

// ── Panel props ────────────────────────────────────────────────────────────

export interface DriveLinkPanelProps {
  links: OffboardingDriveLink[];
  loading: boolean;
  error: string;
  eligibleTasks: Pick<Task, 'task_id' | 'title'>[];
  tasksLoading: boolean;
  submitting: boolean;
  reviewingId: string | null;
  copiedId: string | null;
  canReview: boolean;
  canSubmit: boolean;
  currentUserId: string;
  onSubmit: (taskId: string, url: string, label?: string) => Promise<void>;
  onReview: (
    workLinkId: string,
    status: 'approved' | 'rejected' | 'revision_requested',
    notes?: string,
  ) => Promise<void>;
  onCopy: (id: string, url: string) => Promise<void>;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DriveLinkPanel({
  links,
  loading,
  error,
  eligibleTasks,
  tasksLoading,
  submitting,
  reviewingId,
  copiedId,
  canReview,
  canSubmit,
  currentUserId,
  onSubmit,
  onReview,
  onCopy,
}: DriveLinkPanelProps) {
  const pendingCount  = links.filter((l) => l.status === 'pending_review').length;
  const approvedCount = links.filter((l) => l.status === 'approved').length;
  const rejectedCount = links.filter((l) => l.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* ── Error banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Stats summary ─────────────────────────────────────────────── */}
      {!loading && links.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Pending"
            count={pendingCount}
            colorCls="border-amber-200 bg-amber-50 text-amber-800"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 text-amber-500"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <StatCard
            label="Approved"
            count={approvedCount}
            colorCls="border-green-200 bg-green-50 text-green-800"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 text-green-500"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
          />
          <StatCard
            label="Needs Revision"
            count={rejectedCount}
            colorCls="border-red-200 bg-red-50 text-red-800"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 text-red-500"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            }
          />
        </div>
      )}

      {/* ── Submission form (interns + managers) ──────────────────────── */}
      {canSubmit && (
        <section aria-label="Submit a new deliverable">
          <DriveLinkForm
            eligibleTasks={tasksLoading ? [] : eligibleTasks}
            submitting={submitting}
            onSubmit={onSubmit}
          />
        </section>
      )}

      {/* ── Deliverable list ──────────────────────────────────────────── */}
      <section aria-label="Deliverable links">
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          {canReview ? 'All Google Drive Deliverables' : 'Your Submitted Deliverables'}
        </h2>

        {loading ? (
          /* Skeleton loader */
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="mb-2 flex justify-between">
                  <div className="h-4 w-1/3 rounded bg-slate-200" />
                  <div className="h-4 w-20 rounded-full bg-slate-100" />
                </div>
                <div className="h-3 w-3/4 rounded bg-slate-100" />
                <div className="mt-3 h-3 w-1/4 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : (
          <DriveLinkList
            links={links}
            currentUserId={currentUserId}
            canReview={canReview}
            reviewingId={reviewingId}
            copiedId={copiedId}
            onCopy={onCopy}
            onReview={onReview}
          />
        )}
      </section>
    </div>
  );
}
