import type { TaskListItem } from '../../../types/task';
import { formatTaskDeadlineLabel, isOverdueDeadline } from '../../../utils/dateUtils';
import { BADGE_BASE, STATUS_STYLES, PRIORITY_STYLES } from '../constants/taskStyleConstants';

type TaskRowProps = {
  task: TaskListItem;
  onClick: () => void;
  selectionMode: boolean;
  selected: boolean;
  canSelect: boolean;
  onToggleSelect: () => void;
};

const formatDate = (value?: string | Date) => {
  if (!value) {
    return 'No due';
  }

  return new Date(value).toLocaleDateString();
};


const formatAssignees = (task: TaskListItem) => {
  if (!task.assigned_users.length) {
    return 'Unassigned';
  }

  return task.assigned_users
    .slice(0, 2)
    .map((user) => `${user.first_name} ${user.last_name}`.trim() || user.email)
    .join(', ');
};

export default function TaskRow({ task, onClick, selectionMode, selected, canSelect, onToggleSelect }: TaskRowProps) {
  const isCompleted = task.status === 'Completed';
  const isOverdue = task.is_overdue ?? isOverdueDeadline(task.deadline, task.status);
  const completionDeadlineLabel = !task.deadline
    ? 'Completed'
    : isOverdue
      ? 'Completed late'
      : 'Completed on-time';
  const rowClassName = isCompleted
    ? 'bg-slate-50 text-slate-600 hover:bg-slate-100/70'
    : 'hover:bg-slate-50';
  const nonDeletableClassName = selectionMode && !canSelect ? 'bg-amber-50/80' : '';
  const rowCursorClassName = selectionMode && !canSelect ? 'cursor-not-allowed' : 'cursor-pointer';

  return (
    <tr
      className={`transition-colors ${rowCursorClassName} border-b border-slate-200 ${rowClassName} ${nonDeletableClassName}`}
      onClick={selectionMode ? (canSelect ? onToggleSelect : undefined) : onClick}
    >
      {selectionMode ? (
        <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            disabled={!canSelect}
            onChange={onToggleSelect}
            className="h-4 w-4 rounded border-slate-300 text-rose-600 disabled:cursor-not-allowed"
            title={canSelect ? 'Selectable for deletion' : 'Not deletable: completed tasks require superadmin; otherwise only creator or admin can delete'}
          />
        </td>
      ) : null}

      {/* Title — primary visual anchor */}
      <td className={`px-4 py-4 ${isCompleted ? 'text-slate-500' : 'text-slate-900'}`}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold">{task.title}</span>
          {selectionMode && !canSelect ? (
            <span className="shrink-0 rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
              Not deletable
            </span>
          ) : null}
        </div>
      </td>

      {/* Status badge */}
      <td className="whitespace-nowrap px-4 py-4">
        <span className={`${BADGE_BASE} ${STATUS_STYLES[task.status]}`}>
          {task.status}
        </span>
      </td>

      {/* Priority badge */}
      <td className="whitespace-nowrap px-4 py-4">
        <span className={`${BADGE_BASE} ${PRIORITY_STYLES[task.priority]}`}>
          {task.priority}
        </span>
      </td>

      {/* Assignees */}
      <td className="px-4 py-4 text-sm text-slate-600">{formatAssignees(task)}</td>

      {/* Deadline */}
      <td
        className={`whitespace-nowrap px-4 py-4 text-sm tabular-nums ${isCompleted ? (isOverdue ? 'text-rose-600' : 'text-emerald-700') : (isOverdue ? 'text-rose-600' : 'text-slate-600')}`}
        title={formatDate(task.deadline)}
      >
        {isCompleted ? completionDeadlineLabel : formatTaskDeadlineLabel(task.deadline)}
      </td>

      {/* Comments count */}
      <td className="w-20 whitespace-nowrap px-4 py-4 text-center text-sm text-slate-600">{task.comments_count}</td>
    </tr>
  );
}
