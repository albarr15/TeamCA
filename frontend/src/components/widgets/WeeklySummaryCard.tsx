import Card from '../ui/Card';
import { WidgetSkeleton } from '../ui/Skeleton';
import type { ProductivitySummary } from '../../types/productivity';

type Props = {
  summary: ProductivitySummary | null;
  isLoading: boolean;
};

const formatWeekRange = (startIso: string, endIso: string): string => {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
};

export default function WeeklySummaryCard({ summary, isLoading }: Props) {
  if (isLoading || !summary) {
    return (
      <Card className="p-5">
        <WidgetSkeleton lines={3} />
      </Card>
    );
  }

  const { week } = summary;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          This week
        </h3>
        <span className="text-xs text-slate-400">
          {formatWeekRange(week.start, week.end)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-emerald-50 p-3">
          <p className="text-xs font-medium text-emerald-700">Hours</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-800">
            {week.hours_worked.toFixed(1)}
          </p>
          <p className="text-[10px] text-emerald-700/70">
            of {week.target_hours.toFixed(0)}h target
          </p>
        </div>
        <div className="rounded-lg bg-indigo-50 p-3">
          <p className="text-xs font-medium text-indigo-700">Tasks done</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-800">
            {week.tasks_completed}
          </p>
          <p className="text-[10px] text-indigo-700/70">completed</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-700">Days in</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-800">
            {week.days_clocked_in}
          </p>
          <p className="text-[10px] text-amber-700/70">clocked in</p>
        </div>
      </div>
    </Card>
  );
}
