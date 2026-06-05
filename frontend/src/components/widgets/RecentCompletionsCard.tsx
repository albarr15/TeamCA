import { Target } from 'lucide-react';
import Card from '../ui/Card';
import { WidgetSkeleton } from '../ui/Skeleton';
import type { ProductivitySummary } from '../../types/productivity';

type Props = {
  summary: ProductivitySummary | null;
  isLoading: boolean;
};

const formatRelative = (iso: string): string => {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;
  const minute = 60 * 1000;

  if (diffMs < hour) {
    const m = Math.max(1, Math.floor(diffMs / minute));
    return `${m}m ago`;
  }
  if (diffMs < day) {
    const h = Math.floor(diffMs / hour);
    return `${h}h ago`;
  }
  const d = Math.floor(diffMs / day);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

export default function RecentCompletionsCard({ summary, isLoading }: Props) {
  if (isLoading || !summary) {
    return (
      <Card className="p-6">
        <WidgetSkeleton lines={5} />
      </Card>
    );
  }

  const items = summary.recent_completions;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Recently completed</h3>
          <p className="mt-0.5 text-xs text-slate-500">Your latest wins</p>
        </div>
        <a href="/tasks?status=Completed" className="text-xs font-medium text-indigo-600 hover:underline">
          View all →
        </a>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-center">
          <Target className="h-7 w-7 text-slate-400" aria-hidden />
          <p className="mt-2 text-sm text-slate-600">No completed tasks yet</p>
          <p className="mt-1 text-xs text-slate-400">Finish one to start building your streak.</p>
        </div>
      ) : (
        <ul className="-mx-2 space-y-1">
          {items.slice(0, 6).map((item) => (
            <li key={`${item.task_id}-${item.completed_at}`}>
              <a
                href={`/tasks?taskId=${encodeURIComponent(item.task_id)}`}
                className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                    aria-hidden
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium text-slate-800 group-hover:text-indigo-600">
                    {item.title}
                  </span>
                </div>
                <span className="flex-shrink-0 text-xs tabular-nums text-slate-400">
                  {formatRelative(item.completed_at)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
