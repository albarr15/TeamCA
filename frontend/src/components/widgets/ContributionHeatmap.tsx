import { useMemo } from 'react';
import Card from '../ui/Card';
import { WidgetSkeleton } from '../ui/Skeleton';
import type { ProductivitySummary } from '../../types/productivity';

type Props = {
  summary: ProductivitySummary | null;
  isLoading: boolean;
};

const LEVELS = [
  'bg-slate-100',
  'bg-emerald-200',
  'bg-emerald-400',
  'bg-emerald-600',
  'bg-emerald-800',
];

const levelFor = (count: number): number => {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
};

const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ContributionHeatmap({ summary, isLoading }: Props) {
  const weeks = useMemo(() => {
    if (!summary) return [] as Array<Array<{ date: string; count: number }>>;
    const cols: Array<Array<{ date: string; count: number }>> = [];
    const days = summary.heatmap;
    for (let i = 0; i < days.length; i += 7) {
      cols.push(days.slice(i, i + 7));
    }
    return cols;
  }, [summary]);

  const monthLabels = useMemo(() => {
    const out: Array<{ col: number; label: string }> = [];
    let lastMonth = -1;
    weeks.forEach((col, idx) => {
      const first = col[0];
      if (!first) return;
      const month = Number(first.date.split('-')[1]) - 1;
      if (month !== lastMonth) {
        out.push({ col: idx, label: MONTH_LABELS[month] ?? '' });
        lastMonth = month;
      }
    });
    return out;
  }, [weeks]);

  const totalCompletions = useMemo(
    () => (summary ? summary.heatmap.reduce((sum, d) => sum + d.count, 0) : 0),
    [summary],
  );

  if (isLoading || !summary) {
    return (
      <Card className="p-6">
        <WidgetSkeleton lines={4} />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Activity</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {totalCompletions} task{totalCompletions === 1 ? '' : 's'} completed over the last {summary.heatmap_weeks} weeks
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span>Less</span>
          {LEVELS.map((cls, idx) => (
            <span key={idx} className={`h-2.5 w-2.5 rounded-[2px] ${cls}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels row */}
          <div
            className="grid gap-[3px] pb-1.5 pl-8"
            style={{ gridTemplateColumns: `repeat(${weeks.length}, 13px)` }}
          >
            {weeks.map((_, idx) => {
              const label = monthLabels.find((m) => m.col === idx)?.label ?? '';
              return (
                <div key={idx} className="text-[10px] leading-none text-slate-400">
                  {label}
                </div>
              );
            })}
          </div>

          <div className="flex gap-[3px]">
            <div className="flex flex-col gap-[3px] pr-1.5 text-[10px] text-slate-400">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, idx) => (
                <div key={idx} className="h-[13px] leading-[13px]">
                  {label}
                </div>
              ))}
            </div>

            {weeks.map((col, colIdx) => (
              <div key={colIdx} className="flex flex-col gap-[3px]">
                {col.map((day) => {
                  const level = levelFor(day.count);
                  return (
                    <div
                      key={day.date}
                      className={`h-[13px] w-[13px] rounded-[3px] ${LEVELS[level]} transition-transform hover:scale-125`}
                      title={`${formatDate(day.date)} — ${day.count} task${day.count === 1 ? '' : 's'}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
