import { Types } from "mongoose";
import DTR from "../models/DTR.js";
import Task from "../models/Task.js";
import TaskAssignment from "../models/TaskAssignment.js";
import TaskStatusHistory from "../models/TaskStatusHistory.js";
import User from "../models/User.js";

const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

const toPHTime = (date: Date): Date => new Date(date.getTime() + PH_OFFSET_MS);
const fromPHToDateKey = (date: Date): string => {
  const ph = toPHTime(date);
  return `${ph.getUTCFullYear()}-${String(ph.getUTCMonth() + 1).padStart(2, "0")}-${String(ph.getUTCDate()).padStart(2, "0")}`;
};

const startOfPHDay = (date: Date): Date => {
  const ph = toPHTime(date);
  ph.setUTCHours(0, 0, 0, 0);
  return new Date(ph.getTime() - PH_OFFSET_MS);
};

/**
 * ISO week start (Monday 00:00 PH) for the date's week.
 */
export const startOfPHISOWeek = (date: Date): Date => {
  const start = startOfPHDay(date);
  const ph = toPHTime(start);
  const day = ph.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Sunday → -6, Monday → 0, ...
  return new Date(start.getTime() + diff * 24 * 60 * 60 * 1000);
};

const endOfPHISOWeek = (date: Date): Date => {
  const start = startOfPHISOWeek(date);
  return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
};

export const parseTimeHHMM = (value?: string): number => {
  if (!value) return 0;
  const [h, m] = value.split(":").map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
};

export const computeWeeklyTargetHours = (user: {
  working_hours?: { start?: string; end?: string };
  working_days?: string[];
}): number => {
  const startMin = parseTimeHHMM(user.working_hours?.start);
  const endMin = parseTimeHHMM(user.working_hours?.end);
  const dailyMinutes = Math.max(0, endMin - startMin);
  const daysPerWeek = Array.isArray(user.working_days) && user.working_days.length > 0
    ? user.working_days.length
    : 5;
  return (dailyMinutes / 60) * daysPerWeek;
};

export type ProductivitySummary = {
  user: { first_name: string; last_name: string };
  week: {
    start: Date;
    end: Date;
    hours_worked: number;
    target_hours: number;
    tasks_completed: number;
    days_clocked_in: number;
  };
  streak: {
    current_days: number;
    longest_days: number;
  };
  recent_completions: Array<{
    task_id: string;
    title: string;
    completed_at: Date;
  }>;
};

const getCompletionDatesForUser = async (
  userId: Types.ObjectId,
  since?: Date,
): Promise<Date[]> => {
  // Tasks the user is assigned to
  const assignments = await TaskAssignment.find({ assigned_to: userId })
    .select("task_id")
    .lean();
  const taskIds = assignments.map((a) => a.task_id);
  if (taskIds.length === 0) return [];

  const query: Record<string, unknown> = {
    task_id: { $in: taskIds },
    new_status: "Completed",
  };
  if (since) {
    query.timestamp = { $gte: since };
  }

  const events = await TaskStatusHistory.find(query)
    .select("timestamp")
    .lean();
  return events.map((e) => e.timestamp);
};

export const computeStreaks = (completionDates: Date[]): {
  current: number;
  longest: number;
} => {
  const keys = new Set(completionDates.map((d) => fromPHToDateKey(d)));
  if (keys.size === 0) return { current: 0, longest: 0 };

  // Longest streak: walk all sorted unique keys
  const sortedKeys = [...keys].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sortedKeys.length; i++) {
    const prev = new Date(sortedKeys[i - 1]);
    const cur = new Date(sortedKeys[i]);
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 1) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak: walk back from today (PH) until first miss
  let current = 0;
  const cursor = startOfPHDay(new Date());
  while (true) {
    const key = fromPHToDateKey(cursor);
    if (keys.has(key)) {
      current += 1;
      cursor.setTime(cursor.getTime() - 24 * 60 * 60 * 1000);
    } else {
      // Allow no completion today but keep streak if yesterday had one
      if (current === 0) {
        const todayKey = fromPHToDateKey(new Date());
        if (key === todayKey) {
          cursor.setTime(cursor.getTime() - 24 * 60 * 60 * 1000);
          continue;
        }
      }
      break;
    }
  }

  return { current, longest };
};

export const getProductivitySummary = async (
  userId: string,
): Promise<ProductivitySummary> => {
  const user = await User.findById(userId)
    .select("first_name last_name working_hours working_days")
    .lean();
  if (!user) {
    throw new Error("User not found.");
  }

  const now = new Date();
  const weekStart = startOfPHISOWeek(now);
  const weekEnd = endOfPHISOWeek(now);
  const userObjectId = new Types.ObjectId(userId);

  const [weekDtrRows, weekCompletions, allCompletions] = await Promise.all([
    DTR.find({
      userId: userObjectId,
      date: { $gte: weekStart, $lte: weekEnd },
    })
      .select("date totalHours")
      .lean(),
    getCompletionDatesForUser(userObjectId, weekStart),
    getCompletionDatesForUser(userObjectId),
  ]);

  const hoursWorked = weekDtrRows.reduce(
    (sum, row) => sum + (row.totalHours ?? 0),
    0,
  );
  const daysClockedIn = weekDtrRows.filter(
    (row) => (row.totalHours ?? 0) > 0,
  ).length;
  const tasksCompleted = new Set(
    weekCompletions.map((d) => fromPHToDateKey(d)),
  ).size > 0
    ? weekCompletions.length
    : 0;

  const streaks = computeStreaks(allCompletions);

  // Recent completions: last 10 across all time
  const assignments = await TaskAssignment.find({ assigned_to: userObjectId })
    .select("task_id")
    .lean();
  const taskIds = assignments.map((a) => a.task_id);
  const recentEvents = taskIds.length
    ? await TaskStatusHistory.find({
        task_id: { $in: taskIds },
        new_status: "Completed",
      })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean()
    : [];

  const tasksById = new Map<string, string>();
  if (recentEvents.length > 0) {
    const tasks = await Task.find({
      _id: { $in: recentEvents.map((e) => e.task_id) },
    })
      .select("title")
      .lean();
    for (const t of tasks) tasksById.set(String(t._id), t.title);
  }

  const recent_completions = recentEvents.map((e) => ({
    task_id: String(e.task_id),
    title: tasksById.get(String(e.task_id)) || "Untitled task",
    completed_at: e.timestamp,
  }));

  return {
    user: {
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
    },
    week: {
      start: weekStart,
      end: weekEnd,
      hours_worked: Math.round(hoursWorked * 100) / 100,
      target_hours: Math.round(computeWeeklyTargetHours(user) * 100) / 100,
      tasks_completed: tasksCompleted,
      days_clocked_in: daysClockedIn,
    },
    streak: {
      current_days: streaks.current,
      longest_days: streaks.longest,
    },
    recent_completions,
  };
};
