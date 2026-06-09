import type { TaskPriority, TaskStatus } from '../../../types/task';

/**
 * Base Tailwind classes shared by every pill/badge rendered for tasks.
 * Usage: `${BADGE_BASE} ${STATUS_STYLES[status]}`
 */
export const BADGE_BASE =
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold';

/**
 * Color tokens per TaskStatus — border, background, and text in one string.
 */
export const STATUS_STYLES: Record<TaskStatus, string> = {
  'Not Started': 'border-slate-200/70 bg-slate-50 text-slate-700',
  'In Progress': 'border-sky-200/70 bg-sky-50 text-sky-700',
  'Under Review': 'border-amber-200/70 bg-amber-50 text-amber-700',
  Completed: 'border-emerald-200/70 bg-emerald-50 text-emerald-700',
};

/**
 * Color tokens per TaskPriority — border, background, and text in one string.
 */
export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  Low: 'border-slate-200/70 bg-slate-50 text-slate-700',
  Medium: 'border-amber-200/70 bg-amber-50 text-amber-700',
  High: 'border-rose-200/70 bg-rose-50 text-rose-700',
};
