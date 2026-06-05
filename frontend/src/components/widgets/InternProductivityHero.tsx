import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  Clock,
  Coffee,
  Flame,
  Moon,
  Sandwich,
  Sprout,
  Sun,
  Sunrise,
  Sunset,
  Timer,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { WidgetSkeleton } from '../ui/Skeleton';
import type { ProductivitySummary } from '../../types/productivity';
import {
  computeStatus,
  greetingFor,
  isWorkingDay,
  parseTimeToMinutes,
  type GreetingIconKey,
  type StatusIconKey,
  type StatusTone,
  type WorkingDay,
} from '../../utils/productivityMessage';

const STATUS_ICONS: Record<StatusIconKey, LucideIcon> = {
  alert: AlertTriangle,
  clock: Clock,
  briefcase: Briefcase,
  coffee: Coffee,
  sandwich: Sandwich,
  sunrise: Sunrise,
  sunset: Sunset,
  flame: Flame,
};

const GREETING_ICONS: Record<GreetingIconKey, LucideIcon> = {
  sunrise: Sunrise,
  sun: Sun,
  sunset: Sunset,
  moon: Moon,
};

type Props = {
  summary: ProductivitySummary | null;
  isLoading: boolean;
  clockedIn?: boolean;
  isOnBreak?: boolean;
  clockInTime?: Date | null;
  workingHours?: { start?: string; end?: string };
  workingDays?: WorkingDay[];
};

const PH_TZ = 'Asia/Manila';

const phNow = (epoch?: number): Date => {
  const ms = epoch ?? Date.now();
  const iso = new Date(ms).toLocaleString('en-US', { timeZone: PH_TZ });
  return new Date(iso);
};

// Text stays neutral/black — color is reserved for buttons.
// The status icon still carries the tone so the message still reads with intent.
const TONE_TEXT_CLASS: Record<StatusTone, string> = {
  neutral: 'text-slate-900',
  good: 'text-slate-900',
  praise: 'text-slate-900',
  warn: 'text-slate-900',
  late: 'text-slate-900 font-semibold',
};

const TONE_ICON_CLASS: Record<StatusTone, string> = {
  neutral: 'text-slate-400',
  good: 'text-emerald-500',
  praise: 'text-indigo-500',
  warn: 'text-amber-500',
  late: 'text-red-500',
};

const formatHeroDate = (date: Date): string =>
  date.toLocaleDateString('en-PH', {
    timeZone: PH_TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

const formatHeroTime = (date: Date): string =>
  date.toLocaleTimeString('en-PH', {
    timeZone: PH_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const SessionTimerBadge = ({
  clockInTime,
  isOnBreak,
}: {
  clockInTime: Date;
  isOnBreak: boolean;
}) => {
  // Tick every second so the timer updates live
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const totalSec = Math.max(0, Math.floor((now - clockInTime.getTime()) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const formatted =
    h > 0
      ? `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
      : m > 0
        ? `${m}m ${String(s).padStart(2, '0')}s`
        : `${s}s`;

  const wrapperClass = isOnBreak
    ? 'border-amber-200 bg-amber-50'
    : 'border-emerald-200 bg-emerald-50';
  const dotClass = isOnBreak
    ? 'bg-amber-500'
    : 'bg-emerald-500 animate-pulse';
  const iconClass = isOnBreak ? 'text-amber-600' : 'text-emerald-600';
  const dividerClass = isOnBreak ? 'border-amber-200' : 'border-emerald-200';
  const label = isOnBreak ? 'on break' : 'clocked in';

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm text-slate-900 ${wrapperClass}`}
      aria-label={`${label}, elapsed ${formatted}`}
    >
      <span className={`flex h-2 w-2 flex-shrink-0 rounded-full ${dotClass}`} aria-hidden />
      <Timer className={`h-4 w-4 ${iconClass}`} aria-hidden />
      <span className="text-sm font-semibold tabular-nums">{formatted}</span>
      <span className={`border-l ${dividerClass} pl-2 text-[10px] font-medium uppercase tracking-wider text-slate-600`}>
        {label}
      </span>
    </div>
  );
};

const StreakBadge = ({ days, longest }: { days: number; longest: number }) => {
  if (days === 0) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-slate-900 backdrop-blur">
        <Sprout className="h-4 w-4 text-emerald-600" aria-hidden />
        <span className="text-sm font-medium">Start a streak today</span>
      </div>
    );
  }

  const intensity = days >= 30 ? 1 : days >= 14 ? 0.9 : days >= 7 ? 0.75 : days >= 3 ? 0.6 : 0.4;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-slate-900 shadow-sm">
      <Flame
        className="h-4 w-4 text-orange-500"
        style={{ opacity: intensity }}
        fill="currentColor"
        aria-hidden
      />
      <span className="text-sm font-semibold tabular-nums">
        {days}-day streak
      </span>
      {longest > days && (
        <span className="border-l border-orange-200 pl-2 text-xs text-slate-600">
          best {longest}
        </span>
      )}
    </div>
  );
};

const ProgressRing = ({ value, target }: { value: number; target: number }) => {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const radius = 44;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const showEmptyHint = pct === 0;

  return (
    <div className="relative inline-flex h-28 w-28 flex-shrink-0 items-center justify-center">
      <svg viewBox="0 0 110 110" className="h-28 w-28 -rotate-90">
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <circle
          cx="55"
          cy="55"
          r={radius}
          stroke="rgba(148, 163, 184, 0.22)"
          strokeWidth={stroke}
          fill="none"
        />
        {!showEmptyHint && (
          <circle
            cx="55"
            cy="55"
            r={radius}
            stroke="url(#ring-gradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            fill="none"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        )}
        {showEmptyHint && (
          <circle
            cx="55"
            cy={55 - radius}
            r={stroke / 2}
            fill="#94a3b8"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
        <span className="text-2xl font-bold tabular-nums text-slate-900">{pct}%</span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          weekly
        </span>
      </div>
    </div>
  );
};

const StatRow = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5">
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
    <p className="text-lg font-bold tabular-nums text-slate-900">{value}</p>
  </div>
);

export default function InternProductivityHero({
  summary,
  isLoading,
  clockedIn = false,
  isOnBreak = false,
  clockInTime = null,
  workingHours,
  workingDays,
}: Props) {
  // Tick every 30s so the time display and contextual messages stay fresh
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const phTime = useMemo(() => phNow(tick), [tick]);
  const greeting = useMemo(() => greetingFor(phTime.getHours()), [phTime]);
  const dateStr = useMemo(() => formatHeroDate(new Date(tick)), [tick]);
  const timeStr = useMemo(() => formatHeroTime(new Date(tick)), [tick]);

  if (isLoading || !summary) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50/80 via-white to-cyan-50/80 p-6 shadow-sm">
        <WidgetSkeleton lines={5} />
      </div>
    );
  }

  const firstName = summary.user.first_name || 'there';
  const { week, streak } = summary;
  const startMin = parseTimeToMinutes(workingHours?.start);
  const endMin = parseTimeToMinutes(workingHours?.end);
  const workingDay = isWorkingDay(phTime, workingDays);

  const status = computeStatus({
    now: phTime,
    summary,
    clockedIn,
    isOnBreak,
    clockInTime,
    startMin,
    endMin,
    workingDay,
  });

  const GreetingIcon = GREETING_ICONS[greeting.iconKey];
  const StatusIcon = status.iconKey ? STATUS_ICONS[status.iconKey] : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50/80 via-white to-cyan-50/80 shadow-sm">
      <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-8">
        {/* Left: greeting */}
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <GreetingIcon className={`h-4 w-4 ${greeting.iconClass}`} aria-hidden />
            <span className="font-semibold uppercase tracking-[0.18em]">{greeting.label}</span>
            <span aria-hidden>·</span>
            <span>{dateStr}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{timeStr}</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Hi, {firstName}
          </h2>
          <div className={`flex max-w-xl items-start gap-2 text-base ${TONE_TEXT_CLASS[status.tone]}`}>
            {StatusIcon && (
              <StatusIcon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${TONE_ICON_CLASS[status.tone]}`} aria-hidden />
            )}
            <p>{status.text}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {clockedIn && clockInTime && (
              <SessionTimerBadge clockInTime={clockInTime} isOnBreak={isOnBreak} />
            )}
            <StreakBadge days={streak.current_days} longest={streak.longest_days} />
          </div>
        </div>

        {/* Right: compact stats panel */}
        <div className="flex items-center gap-5 rounded-2xl border border-white/60 bg-white/55 p-4 backdrop-blur lg:min-w-[320px]">
          <ProgressRing value={week.hours_worked} target={week.target_hours} />
          <div className="flex-1 divide-y divide-slate-200/70">
            <StatRow
              label="Hours"
              value={week.hours_worked.toFixed(1)}
              hint={`of ${week.target_hours.toFixed(0)}h`}
            />
            <StatRow
              label="Tasks"
              value={String(week.tasks_completed)}
              hint="completed"
            />
            <StatRow
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
