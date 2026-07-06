// frontend/src/features/offboarding/OffboardingDashboard.tsx
// Main interactive hub container for the /offboarding route.
//
// Responsibilities:
//   • Defines all 8 tab configurations (with role-visibility rules)
//   • Filters visible tabs based on role flags received from OffboardingPage
//   • Owns active-tab state
//   • Renders: HubHeader → TabNav → active panel content
//   • Renders the global toast notification stack
//
// Design:
//   • Warm beige page background (bg-beige-50)
//   • White card container with rounded-2xl for the tab shell
//   • CSS-only transitions for tab switching (no framer-motion)

import { useState } from 'react';

import type { OffboardingDriveLink, Task } from '../../types/task';
import HubHeader from './components/HubHeader';
import TabNav, { type TabDefinition } from './components/TabNav';
import DriveLinkPanel from './components/DriveLinkPanel';

// ── Toast type ─────────────────────────────────────────────────────────────

export type ToastItem = {
  id: string;
  message: string;
  exiting: boolean;
};

// ── Tab IDs ────────────────────────────────────────────────────────────────

type TabId =
  | 'drive-links'
  | 'exit-checklist'
  | 'review-panel'
  | 'feedback-analytics'
  | 'extension-request'
  | 'clearance-timeline'
  | 'readiness-score'
  | 'alumni-profile';

// ── Tab visibility groups ──────────────────────────────────────────────────
//   'all'        → every authenticated user sees this tab
//   'intern'     → only interns
//   'reviewer'   → supervisors, heads, admins, superadmins
//   'admin'      → admins and superadmins only

type VisibleTo = 'all' | 'intern' | 'reviewer' | 'admin';

interface TabConfig extends TabDefinition {
  id: TabId;
  visibleTo: VisibleTo;
}

// ── Static tab definitions ─────────────────────────────────────────────────

const ALL_TABS: TabConfig[] = [
  {
    id: 'drive-links',
    label: 'Drive Links',
    implemented: true,
    visibleTo: 'all',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
    ),
  },
  {
    id: 'exit-checklist',
    label: 'Exit Checklist',
    implemented: false,
    visibleTo: 'intern',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    id: 'review-panel',
    label: 'Review Panel',
    implemented: false,
    visibleTo: 'reviewer',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: 'feedback-analytics',
    label: 'Feedback Analytics',
    implemented: false,
    visibleTo: 'admin',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    id: 'extension-request',
    label: 'Extension Request',
    implemented: false,
    visibleTo: 'intern',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: 'clearance-timeline',
    label: 'Clearance Timeline',
    implemented: false,
    visibleTo: 'all',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    id: 'readiness-score',
    label: 'Readiness Score',
    implemented: false,
    visibleTo: 'all',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
    ),
  },
  {
    id: 'alumni-profile',
    label: 'Alumni Profile',
    implemented: false,
    visibleTo: 'all',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

// ── Props ──────────────────────────────────────────────────────────────────

export interface OffboardingDashboardProps {
  // Role flags
  isSuperadmin: boolean;
  isAdmin: boolean;
  isHeadOrSupervisor: boolean;
  isIntern: boolean;
  canReview: boolean;
  canSubmit: boolean;
  roleLabel: string;
  currentUserId: string;

  // Drive Links data
  links: OffboardingDriveLink[];
  loading: boolean;
  error: string;
  eligibleTasks: Pick<Task, 'task_id' | 'title'>[];
  tasksLoading: boolean;
  submitting: boolean;
  reviewingId: string | null;
  copiedId: string | null;
  toasts: ToastItem[];

  // Handlers
  onSubmit: (taskId: string, url: string, label?: string) => Promise<void>;
  onReview: (
    workLinkId: string,
    status: 'approved' | 'rejected',
    notes?: string,
  ) => Promise<void>;
  onCopy: (id: string, url: string) => Promise<void>;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function OffboardingDashboard({
  isSuperadmin,
  isAdmin,
  isHeadOrSupervisor,
  isIntern,
  canReview,
  canSubmit,
  roleLabel,
  currentUserId,
  links,
  loading,
  error,
  eligibleTasks,
  tasksLoading,
  submitting,
  reviewingId,
  copiedId,
  toasts,
  onSubmit,
  onReview,
  onCopy,
}: OffboardingDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('drive-links');

  // ── Role-based tab filtering ─────────────────────────────────────────────
  const visibleTabs = ALL_TABS.filter((tab) => {
    switch (tab.visibleTo) {
      case 'all':      return true;
      case 'intern':   return isIntern;
      case 'reviewer': return isHeadOrSupervisor || isAdmin || isSuperadmin;
      case 'admin':    return isAdmin || isSuperadmin;
      default:         return false;
    }
  });

  const handleTabChange = (tabId: string) => {
    const tab = visibleTabs.find((t) => t.id === tabId);
    if (tab?.implemented) {
      setActiveTab(tabId as TabId);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-8">
      {/* ── Global toast stack ─────────────────────────────────────── */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              'rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg',
              'transition-all duration-300',
              t.exiting ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
            ].join(' ')}
          >
            {t.message}
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-5xl space-y-6">
        {/* ── Hub header ────────────────────────────────────────────── */}
        <HubHeader roleLabel={roleLabel} />

        {/* ── Tab shell ─────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Tab navigation bar */}
          <TabNav
            tabs={visibleTabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          {/* Panel content area */}
          <div className="p-6">
            {activeTab === 'drive-links' && (
              <DriveLinkPanel
                links={links}
                loading={loading}
                error={error}
                eligibleTasks={eligibleTasks}
                tasksLoading={tasksLoading}
                submitting={submitting}
                reviewingId={reviewingId}
                copiedId={copiedId}
                canReview={canReview}
                canSubmit={canSubmit}
                currentUserId={currentUserId}
                onSubmit={onSubmit}
                onReview={onReview}
                onCopy={onCopy}
              />
            )}
            {/*
             * Future panels are wired here as tabs are implemented.
             * They are not reachable yet because their tab buttons are disabled.
             *
             * activeTab === 'exit-checklist'      → <ExitChecklistPanel />
             * activeTab === 'review-panel'         → <ReviewPanel />
             * activeTab === 'feedback-analytics'   → <FeedbackAnalyticsPanel />
             * activeTab === 'extension-request'    → <ExtensionRequestPanel />
             * activeTab === 'clearance-timeline'   → <ClearanceTimelinePanel />
             * activeTab === 'readiness-score'      → <ReadinessScorePanel />
             * activeTab === 'alumni-profile'       → <AlumniProfilePanel />
             */}
          </div>
        </div>
      </div>
    </div>
  );
}
