import type { Task } from '../../types/task';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { ActivityListItemSkeleton } from '../ui/Skeleton';
import { BADGE_BASE, STATUS_STYLES, PRIORITY_STYLES } from '../../features/tasks/constants/taskStyleConstants';
import { formatTaskDeadlineLabel, isOverdueDeadline } from '../../utils/dateUtils';

type TaskBriefWidgetProps = {
  tasks: Task[];
  isLoading?: boolean;
};

export default function TaskBriefWidget({ tasks, isLoading = false }: TaskBriefWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tasks To Do</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <ActivityListItemSkeleton key={index} />
            ))}
          </div>
        ) : null}

        {!isLoading && tasks.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks available yet.</p>
        ) : null}

        {!isLoading && tasks.length > 0 ? (
          <ul className="space-y-3">
            {tasks.slice(0, 5).map((task) => {
              const isOverdue = isOverdueDeadline(task.deadline, task.status);
              const deadlineLabel = formatTaskDeadlineLabel(task.deadline);

              return (
                <li
                  key={task.task_id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                >
                  {/* Primary row: title + status */}
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
                      {task.title}
                    </p>
                    <span className={`${BADGE_BASE} shrink-0 ${STATUS_STYLES[task.status]}`}>
                      {task.status}
                    </span>
                  </div>

                  {/* Secondary row: priority + deadline */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className={`${BADGE_BASE} ${PRIORITY_STYLES[task.priority]}`}>
                      {task.priority}
                    </span>
                    {task.deadline ? (
                      <span
                        className={`text-xs tabular-nums ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}
                      >
                        {deadlineLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No due date</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}