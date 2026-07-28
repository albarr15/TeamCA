// file: backend/src/services/readinessScoreService.ts
// Computes the weighted Internship Completion Readiness Score for a single
// intern. This is a *display/progress* metric shown on the intern's own
// dashboard — it does not replace the strict all-or-nothing gate already
// enforced in offboardingApprovalService.getReadiness()/approveOffboarding().

import { Types } from "mongoose";
import InternProfile from "../models/InternProfile.js";
import TaskAssignment from "../models/TaskAssignment.js";
import Task from "../models/Task.js";
import TaskWorkLink from "../models/TaskWorkLink.js";
import DTRSummary from "../models/DTRSummary.js";

const toObjectId = (id: string) => new Types.ObjectId(id);

// ── Weights (sum to 1.0) ─────────────────────────────────────────────────────
const WEIGHTS = {
  hours: 0.3,
  tasks: 0.3,
  attendance: 0.2,
  deliverables: 0.2,
} as const;

// ── Threshold states ─────────────────────────────────────────────────────────
export type ReadinessState = "Not Ready" | "Almost Ready" | "Eligible";

const resolveState = (score: number): ReadinessState => {
  if (score >= 100) return "Eligible";
  if (score >= 85) return "Almost Ready";
  return "Not Ready";
};

export type ReadinessBreakdown = {
  hoursScore: number;
  taskScore: number;
  attendanceScore: number;
  deliverablesScore: number;
  overallScore: number;
  state: ReadinessState;
  details: {
    renderedHours: number;
    requiredHours: number;
    tasksCompleted: number;
    tasksTotal: number;
    daysPresent: number;
    daysLate: number;
    daysAbsent: number;
    deliverablesApproved: number;
    deliverablesTotal: number;
  };
};

// Caps a ratio at 100 so over-delivering (e.g. more hours than required)
// doesn't push a sub-score above the max.
const clampPercent = (numerator: number, denominator: number): number => {
  if (denominator <= 0) return numerator > 0 ? 100 : 0;
  return Math.min(100, Math.round((numerator / denominator) * 100));
};

export const getReadinessScore = async (userId: string): Promise<ReadinessBreakdown> => {
  const userObjectId = toObjectId(userId);

  const [profile, assignments, driveLinks, dtrSummaries] = await Promise.all([
    InternProfile.findOne({ user_id: userObjectId }).lean(),
    TaskAssignment.find({ assigned_to: userObjectId }).select("task_id").lean(),
    TaskWorkLink.find({ submitted_by: userObjectId, platform: "drive" })
      .select("status")
      .lean(),
    DTRSummary.find({ userId: userObjectId })
      .select("daysPresent daysLate daysAbsent daysOnLeave")
      .lean(),
  ]);

  if (!profile) throw new Error("Intern profile not found.");

  // ── Hours ──────────────────────────────────────────────────────────────────
  const renderedHours = profile.rendered_hours_total ?? 0;
  const requiredHours = profile.required_hours;
  const hoursScore = clampPercent(renderedHours, requiredHours);

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const taskIds = assignments.map((a) => a.task_id);
  const tasks = taskIds.length
    ? await Task.find({ _id: { $in: taskIds } }).select("status").lean()
    : [];
  const tasksTotal = tasks.length;
  const tasksCompleted = tasks.filter((t) => t.status === "Completed").length;
  // No tasks assigned yet → treat as not-yet-started rather than trivially 100%.
  const taskScore = tasksTotal === 0 ? 0 : clampPercent(tasksCompleted, tasksTotal);

  // ── Attendance ─────────────────────────────────────────────────────────────
  // Aggregate across every DTRSummary period (week/month) recorded for this
  // intern's whole internship, not just the current week.
  const totals = dtrSummaries.reduce(
    (acc, s) => {
      acc.present += s.daysPresent ?? 0;
      acc.late += s.daysLate ?? 0;
      acc.absent += s.daysAbsent ?? 0;
      return acc;
    },
    { present: 0, late: 0, absent: 0 },
  );
  // Late days count as a partial attendance miss, not a full miss —
  // weight them at 50% credit relative to a fully present day.
  const attendanceDenominator = totals.present + totals.late + totals.absent;
  const attendanceNumerator = totals.present + totals.late * 0.5;
  const attendanceScore = clampPercent(attendanceNumerator, attendanceDenominator);

  // ── Deliverables ───────────────────────────────────────────────────────────
  const deliverablesTotal = driveLinks.length;
  const deliverablesApproved = driveLinks.filter((l) => l.status === "approved").length;
  const deliverablesScore =
    deliverablesTotal === 0 ? 0 : clampPercent(deliverablesApproved, deliverablesTotal);

  // ── Weighted overall ───────────────────────────────────────────────────────
  const overallScore = Math.round(
    hoursScore * WEIGHTS.hours +
      taskScore * WEIGHTS.tasks +
      attendanceScore * WEIGHTS.attendance +
      deliverablesScore * WEIGHTS.deliverables,
  );

  return {
    hoursScore,
    taskScore,
    attendanceScore,
    deliverablesScore,
    overallScore,
    state: resolveState(overallScore),
    details: {
      renderedHours,
      requiredHours,
      tasksCompleted,
      tasksTotal,
      daysPresent: totals.present,
      daysLate: totals.late,
      daysAbsent: totals.absent,
      deliverablesApproved,
      deliverablesTotal,
    },
  };
};