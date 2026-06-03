import { useMemo } from 'react';
import { WidgetSkeleton } from '../ui/Skeleton';
import type { ProductivitySummary } from '../../types/productivity';

type Props = {
  summary: ProductivitySummary | null;
  isLoading: boolean;
};

const greetingFor = (hour: number): string => {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const messageFor = (summary: ProductivitySummary): string => {
  const { week, streak } = summary;
  if (streak.current_days >= 7) {
    return `${streak.current_days} days in a row of completed work — impressive consistency.`;
  }
  if (streak.current_days >= 3) {
    return `You're on a ${streak.current_days}-day streak. Keep the momentum going.`;
  }
  if (week.tasks_completed >= 5) {
    return `${week.tasks_completed} tasks shipped this week. Solid output.`;
  }
  if (week.tasks_completed > 0) {
    return `${week.tasks_completed} task${week.tasks_completed === 1 ? '' : 's'} completed this week — nice work.`;
  }
  if (week.hours_worked > 0) {
    return `${week.hours_worked.toFixed(1)}h logged this week. Pick a task to chip away at.`;
  }
  return 'Fresh week ahead. Clock in and pick your first task.';
};

const formatDate = (date: Date): string =>
  date.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

const StreakBadge = ({ days, longest }: { days: number; longest: number }) => {
  if (days === 0) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-slate-600 backdrop-blur">
        <span className="text-base" aria-hidden>🌱</span>
        <span className="text-sm font-medium">Start a streak today</span>
      </div>
    );
  }

  const intensity = days >= 30 ? 1 : days >= 14 ? 0.9 : days >= 7 ? 0.75 : days >= 3 ? 0.6 : 0.4;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-orange-700 shadow-sm">
      <span className="text-base" style={{ opacity: intensity }} aria-hidden>🔥</span>
      <span className="text-sm font-semibold tabular-nums">
        {days}-day streak
      </span>
      {longest > days && (
        <span className="border-l border-orange-200 pl-2 text-xs text-orange-600/80">
          best {longest}
        </span>
      )}
    </div>
  );
};

const ProgressRing = ({ value, target }: { value: number; target: number }) => {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const radius = 56;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative inline-flex h-36 w-36 items-center justify-center">
      <svg viewBox="0 0 140 140" className="h-36 w-36 -rotate-90">
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke="rgba(148, 163, 184, 0.25)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke="url(#ring-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="none"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums text-slate-900">{pct}%</span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">of weekly target</span>
      </div>
    </div>
  );
};

const KpiTile = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-xl bg-white/70 px-4 py-3 backdrop-blur">
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</p>
    {hint && <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>}
  </div>
);

export default function InternProductivityHero({ summary, isLoading }: Props) {
  const greeting = useMemo(() => greetingFor(new Date().getHours()), []);
  const today = useMemo(() => formatDate(new Date()), []);

  if (isLoading || !summary) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6 shadow-sm">
        <WidgetSkeleton lines={5} />
      </div>
    );
  }

  const firstName = summary.user.first_name || 'there';
  const message = messageFor(summary);
  const { week, streak } = summary;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 shadow-sm">
      <div className="grid gap-6 p-6 lg:grid-cols-[1.5fr_1fr] lg:items-center lg:p-8">
        {/* Left: greeting */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-[0.18em]">{greeting}</span>
            <span aria-hidden>·</span>
            <span>{today}</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Hi, {firstName} 👋
          </h2>
          <p className="max-w-xl text-base text-slate-600">{message}</p>
          <div className="pt-1">
            <StreakBadge days={streak.current_days} longest={streak.longest_days} />
          </div>
        </div>

        {/* Right: ring + KPIs */}
        <div className="space-y-4 lg:pl-4">
          <div className="flex justify-center lg:justify-end">
            <ProgressRing value={week.hours_worked} target={week.target_hours} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <KpiTile
              label="Hours"
              value={week.hours_worked.toFixed(1)}
              hint={`of ${week.target_hours.toFixed(0)}h`}
            />
            <KpiTile
              label="Tasks"
              value={String(week.tasks_completed)}
              hint="completed"
            />
            <KpiTile
              label="Days in"
              value={String(week.days_clocked_in)}
              hint="clocked in"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
