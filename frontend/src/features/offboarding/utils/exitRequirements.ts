// frontend/src/features/offboarding/utils/exitRequirements.ts
// Pure computation layer for the "Exit Checklist" tab (Internship Exit
// Requirement Tracker).
//
// Deliberately has no side effects and no network calls — it only derives a
// list of requirement items from data the rest of the app already fetches
// (assigned tasks, offboarding drive links, and the intern's profile hours).
// This keeps the tracker in sync with the source of truth instead of
// duplicating state in a new backend collection.

import type { InternProfile } from '../../../types/user';
import type { OffboardingDriveLink, Task } from '../../../types/task';

// ── Status chip type ─────────────────────────────────────────────────────────
// Matches the four chip variants requested for the tracker: pending,
// approved, rejected, completed. Not every requirement uses every status —
// e.g. "hours rendered" only ever resolves to pending/completed — but the
// shared vocabulary keeps the UI consistent across requirement types.
export type RequirementStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface ExitRequirement {
  id: string;
  title: string;
  description: string;
  status: RequirementStatus;
  /** Where "Resolve" / "View" should take the user. */
  navigate: { type: 'tab'; tabId: 'drive-links' } | { type: 'route'; path: string };
}

export interface ExitRequirementsInput {
  internProfile: InternProfile | null;
  tasks: Task[];
  driveLinks: OffboardingDriveLink[];
}

export interface ExitRequirementsResult {
  requirements: ExitRequirement[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
}

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * Requirement: intern must have rendered at least their required internship
 * hours (InternProfile.rendered_hours_total >= required_hours).
 */
function buildHoursRequirement(internProfile: InternProfile | null): ExitRequirement {
  if (!internProfile) {
    return {
      id: 'required-hours',
      title: 'Required Hours Rendered',
      description: 'Intern profile not found yet — hours cannot be verified.',
      status: 'pending',
      navigate: { type: 'route', path: '/dtr' },
    };
  }

  const { rendered_hours_total, required_hours } = internProfile;
  const isComplete = rendered_hours_total >= required_hours;
  const remaining = Math.max(0, required_hours - rendered_hours_total);

  return {
    id: 'required-hours',
    title: 'Required Hours Rendered',
    description: isComplete
      ? `All ${required_hours} required hours have been rendered.`
      : `${round(remaining)} of ${required_hours} required hours remaining (${round(
          rendered_hours_total,
        )} rendered so far).`,
    status: isComplete ? 'completed' : 'pending',
    navigate: { type: 'route', path: '/dtr' },
  };
}

/**
 * Requirement: every task assigned to the intern must reach "Completed".
 * A user with no assigned tasks trivially satisfies this requirement.
 */
function buildTasksRequirement(tasks: Task[]): ExitRequirement {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const underReview = tasks.filter((t) => t.status === 'Under Review').length;

  const isComplete = total === 0 || completed === total;

  let description: string;
  let status: RequirementStatus;
  if (isComplete) {
    description =
      total === 0
        ? 'No tasks have been assigned.'
        : `All ${total} assigned task${total === 1 ? '' : 's'} are completed.`;
    status = 'completed';
  } else if (underReview > 0) {
    description = `${completed} of ${total} tasks completed — ${underReview} awaiting review.`;
    status = 'pending';
  } else {
    description = `${completed} of ${total} tasks completed.`;
    status = 'pending';
  }

  return {
    id: 'assigned-tasks',
    title: 'All Assigned Tasks Completed',
    description,
    status,
    navigate: { type: 'route', path: '/tasks' },
  };
}

/**
 * Requirement: the intern must submit at least one Google Drive deliverable
 * link, and every submitted link must be approved by a reviewer.
 */
function buildDeliverablesRequirement(links: OffboardingDriveLink[]): ExitRequirement {
  const total = links.length;

  if (total === 0) {
    return {
      id: 'drive-deliverables',
      title: 'Deliverables Submitted & Approved',
      description: 'No Google Drive deliverables have been submitted yet.',
      status: 'pending',
      navigate: { type: 'tab', tabId: 'drive-links' },
    };
  }

  const rejected = links.filter((l) => l.status === 'rejected').length;
  const approved = links.filter((l) => l.status === 'approved').length;
  const outstanding = total - approved;

  if (rejected > 0) {
    return {
      id: 'drive-deliverables',
      title: 'Deliverables Submitted & Approved',
      description: `${rejected} deliverable${rejected === 1 ? '' : 's'} rejected — resubmission required.`,
      status: 'rejected',
      navigate: { type: 'tab', tabId: 'drive-links' },
    };
  }

  if (approved === total) {
    return {
      id: 'drive-deliverables',
      title: 'Deliverables Submitted & Approved',
      description: `All ${total} deliverable${total === 1 ? '' : 's'} approved.`,
      status: 'completed',
      navigate: { type: 'tab', tabId: 'drive-links' },
    };
  }

  return {
    id: 'drive-deliverables',
    title: 'Deliverables Submitted & Approved',
    description: `${approved} of ${total} deliverables approved — ${outstanding} still pending review.`,
    status: 'pending',
    navigate: { type: 'tab', tabId: 'drive-links' },
  };
}

export function buildExitRequirements(
  input: ExitRequirementsInput,
): ExitRequirementsResult {
  const requirements: ExitRequirement[] = [
    buildHoursRequirement(input.internProfile),
    buildTasksRequirement(input.tasks),
    buildDeliverablesRequirement(input.driveLinks),
  ];

  const totalCount = requirements.length;
  const completedCount = requirements.filter((r) => r.status === 'completed').length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return { requirements, completedCount, totalCount, progressPercent };
}
