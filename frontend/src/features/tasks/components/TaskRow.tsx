import type { TaskListItem, TaskPriority, TaskStatus } from '../../../types/task';
import { formatTaskDeadlineLabel, isOverdueDeadline } from '../../../utils/dateUtils';

// ---------------------------------------------------------------------------
// Style maps — status
// ---------------------------------------------------------------------------
const STATUS_DOT: Record<TaskStatus, string> = {
  'Not Started': 'bg-slate-400',
  'In Progress': 'bg-sky-500',
  'Under Review': 'bg-amber-500',
  Completed: 'bg-emerald-500',
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  'Not Started': 'border-slate-200/70 bg-slate-50 text-slate-700',
  'In Progress': 'border-sky-200/70 bg-sky-50 text-sky-700',
  'Under Review': 'border-amber-200/70 bg-amber-50 text-amber-700',
  Completed: 'border-emerald-200/70 bg-emerald-50 text-emerald-700',
};

// ---------------------------------------------------------------------------
// Style maps — priority
// ---------------------------------------------------------------------------
const PRIORITY_DOT: Record<TaskPriority, string> = {
  Low: 'bg-slate-400',
  Medium: 'bg-amber-500',
  High: 'bg-rose-500',
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  Low: 'border-slate-200/70 bg-slate-50 text-slate-600',
  Medium: 'border-amber-200/70 bg-amber-50 text-amber-700',
  High: 'border-rose-200/70 bg-rose-50 text-rose-700',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
type TaskRowProps = {
  task: TaskListItem;
  onClick: () => void;
  selectionMode: boolean;
  selected: boolean;
  canSelect: boolean;
  onToggleSelect: () => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatDate = (value?: string | Date) => {
  if (!value) return 'No due date';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatAssignees = (task: TaskListItem): string => {
  if (!task.assigned_users.length) return 'Unassigned';
  const names = task.assigned_users
    .slice(0, 2)
    .map((u) => `${u.first_name} ${u.last_name}`.trim() || u.email);
  const extra = task.assigned_users.length - 2;
  return extra > 0 ? `${names.join(', ')} +${extra}` : names.join(', ');
};

// ---------------------------------------------------------------------------
// Component — Desktop row (table cells) + Mobile card (shown via CSS)
// ---------------------------------------------------------------------------
export default function TaskRow({
  task,
  onClick,
  selectionMode,
  selected,
  canSelect,
  onToggleSelect,
}: TaskRowProps) {
  const isCompleted = task.status === 'Completed';
  const isOverdue = task.is_overdue ?? isOverdueDeadline(task.deadline, task.status);

  const completionDeadlineLabel = !task.deadline
    ? 'Completed'
    : isOverdue
      ? 'Completed late'
      : 'Completed on-time';

  // Row-level styles
  const rowBg = isCompleted
    ? 'bg-slate-50 text-slate-500'
    : 'bg-white hover:bg-slate-50/70';
  const nonSelectableBg = selectionMode && !canSelect ? 'bg-amber-50/60' : '';
  const cursorCls = selectionMode && !canSelect ? 'cursor-not-allowed' : 'cursor-pointer';

  const deadlineCls = isCompleted
    ? isOverdue
      ? 'text-rose-600'
      : 'text-emerald-700'
    : isOverdue
      ? 'text-rose-600 font-semibold'
      : 'text-slate-600';

  return (
    <>
      {/* ── Desktop row (hidden on mobile) ────────────────────────────── */}
      <tr
        className={`hidden sm:table-row transition-colors ${cursorCls} border-b border-slate-100 ${rowBg} ${nonSelectableBg}`}
        onClick={selectionMode ? (canSelect ? onToggleSelect : undefined) : onClick}
      >
        {/* Checkbox column */}
        {selectionMode ? (
          <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selected}
              disabled={!canSelect}
              onChange={onToggleSelect}
              className="h-4 w-4 rounded border-slate-300 text-rose-600 disabled:cursor-not-allowed"
              title={
                canSelect
                  ? 'Select for deletion'
                  : 'Not deletable: completed tasks require superadmin; otherwise only creator or admin can delete'
              }
            />
          </td>
        ) : null}

        {/* Status */}
        <td className="whitespace-nowrap px-4 py-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[task.status]}`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[task.status]}`} aria-hidden="true" />
            {task.status}
          </span>
        </td>

        {/* Title */}
        <td className={`px-4 py-3 text-sm font-medium ${isCompleted ? 'text-slate-500' : 'text-slate-900'}`}>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate max-w-xs">{task.title}</span>
            {selectionMode && !canSelect ? (
              <span className="shrink-0 rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                Not deletable
              </span>
            ) : null}
          </div>
        </td>

        {/* Assignees */}
        <td className="px-4 py-3 text-sm text-slate-500">
          {formatAssignees(task)}
        </td>

        {/* Priority */}
        <td className="whitespace-nowrap px-4 py-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${PRIORITY_STYLES[task.priority]}`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} aria-hidden="true" />
            {task.priority}
          </span>
        </td>

        {/* Deadline */}
        <td
          className={`whitespace-nowrap px-4 py-3 text-sm tabular-nums ${deadlineCls}`}
          title={formatDate(task.deadline)}
        >
          {isCompleted ? completionDeadlineLabel : formatTaskDeadlineLabel(task.deadline)}
          {isOverdue && !isCompleted && (
            <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-rose-500" aria-label="Overdue">
              ●
            </span>
          )}
        </td>

        {/* Comments */}
        <td className="w-20 whitespace-nowrap px-4 py-3 text-center text-sm text-slate-500">
          {task.comments_count > 0 ? (
            <span className="inline-flex items-center gap-1 text-slate-600">
              <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H6l-4 4V5z" clipRule="evenodd" />
              </svg>
              {task.comments_count}
            </span>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>
      </tr>

      {/* ── Mobile card (hidden on sm+) ───────────────────────────────── */}
      <tr
        className={`table-row sm:hidden border-b border-slate-100 ${rowBg} ${nonSelectableBg} ${cursorCls}`}
        onClick={selectionMode ? (canSelect ? onToggleSelect : undefined) : onClick}
      >
        <td className="px-3 py-3" colSpan={selectionMode ? 2 : 1}>
          {selectionMode ? (
            <div className="mb-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selected}
                disabled={!canSelect}
                onChange={onToggleSelect}
                className="h-4 w-4 rounded border-slate-300 text-rose-600 disabled:cursor-not-allowed"
              />
              <span className="text-xs text-slate-500">Select</span>
            </div>
          ) : null}

          {/* Title row */}
          <p className={`text-sm font-semibold leading-snug ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
            {task.title}
          </p>

          {/* Badge row */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {/* Status */}
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[task.status]}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[task.status]}`} aria-hidden="true" />
              {task.status}
            </span>

            {/* Priority */}
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_STYLES[task.priority]}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} aria-hidden="true" />
              {task.priority}
            </span>

            {/* Overdue pill */}
            {isOverdue && !isCompleted && (
              <span className="inline-flex items-center rounded-full border border-rose-200/70 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                Overdue
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {/* Assignees */}
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              {formatAssignees(task)}
            </span>

            {/* Deadline */}
            <span className={`flex items-center gap-1 ${deadlineCls}`}>
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              {isCompleted ? completionDeadlineLabel : formatTaskDeadlineLabel(task.deadline)}
            </span>

            {/* Comments */}
            {task.comments_count > 0 && (
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H6l-4 4V5z" clipRule="evenodd" />
                </svg>
                {task.comments_count}
              </span>
            )}
          </div>
        </td>
      </tr>
    </>
  );
}