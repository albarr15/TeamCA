// frontend/src/features/offboarding/components/ExitChecklistPanel.tsx
// Panel component for the "Exit Checklist" tab — the Internship Exit
// Requirement Tracker.
//
// Owns the display of:
//   • Overall offboarding completion progress bar
//   • One card per required offboarding item, with a status chip
//   • A "Resolve" action that jumps straight to the incomplete requirement
//     (either another tab in this hub, or a different page in the app)
//
// All data is received as props from OffboardingPage (data provider), mirroring
// the pattern used by DriveLinkPanel.

import { buildExitRequirements } from '../utils/exitRequirements';
import type { ExitRequirementsInput } from '../utils/exitRequirements';
import RequirementStatusChip from './RequirementStatusChip';
import ExitSurveyForm from './ExitSurveyForm';

export interface ExitChecklistPanelProps extends ExitRequirementsInput {
  loading: boolean;
  error: string;
  /** Switches the active tab within the Offboarding Hub (e.g. to 'drive-links'). */
  onNavigateToTab: (tabId: 'drive-links') => void;
}

export default function ExitChecklistPanel({
  internProfile,
  tasks,
  driveLinks,
  loading,
  error,
  onNavigateToTab,
}: ExitChecklistPanelProps) {
  const { requirements, completedCount, totalCount, progressPercent } =
    buildExitRequirements({ internProfile, tasks, driveLinks });

  const allComplete = totalCount > 0 && completedCount === totalCount;

  const handleResolve = (requirement: (typeof requirements)[number]) => {
    if (requirement.navigate.type === 'tab') {
      onNavigateToTab(requirement.navigate.tabId);
    } else {
      window.location.href = requirement.navigate.path;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-500">
        Loading exit requirements…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Error banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Overall progress ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Offboarding Completion
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {completedCount} of {totalCount} requirements completed
            </p>
          </div>
          <span
            className={`text-2xl font-bold ${
              allComplete ? 'text-green-600' : 'text-slate-900'
            }`}
          >
            {progressPercent}%
          </span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allComplete ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {allComplete && (
          <p className="mt-3 text-xs font-semibold text-green-700">
            🎉 All exit requirements are complete — ready for final clearance.
          </p>
        )}
      </div>

      {/* ── Requirement list ─────────────────────────────────────────── */}
      <div className="space-y-3">
        {requirements.map((requirement) => {
          const isResolved = requirement.status === 'completed';
          return (
            <div
              key={requirement.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900">
                    {requirement.title}
                  </h4>
                  <RequirementStatusChip status={requirement.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{requirement.description}</p>
              </div>

              {!isResolved && (
                <button
                  type="button"
                  onClick={() => handleResolve(requirement)}
                  className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Resolve →
                </button>
              )}
            </div>
          );
        })}
      </div>
      {/* ── Exit Survey ───────────────────────────────────────────────
          Shown once the visible checklist looks complete. ExitSurveyForm
          re-checks eligibility against the authoritative server-side gate
          (offboardingApprovalService.getReadiness()) on its own, so even if
          buildExitRequirements' client-side calc is slightly optimistic or
          doesn't cover every server-side check (e.g. evaluation completion,
          pending extensions), the form will still show the correct blocked
          state rather than letting someone submit early. */}
      {allComplete && (
        <div className="pt-2">
          <ExitSurveyForm />
        </div>
      )}
    </div>
  );
}