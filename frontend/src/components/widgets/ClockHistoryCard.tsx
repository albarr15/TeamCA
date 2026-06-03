import { useMemo } from 'react';
import { Timer } from 'lucide-react';
import Card from '../ui/Card';
import { WidgetSkeleton } from '../ui/Skeleton';
import type { DailyTimeRecord, ClockRecord } from '../../types/dtr';

type Props = {
  records: DailyTimeRecord[];
  isLoading: boolean;
  maxSessions?: number;
};

const PH_TZ = 'Asia/Manila';

type SessionRow = {
  recordId: string;
  date: Date;
  timeIn: Date;
  timeOut: Date | null;
  totalHours: number | null;
  status?: ClockRecord['status'];
  remarks?: string;
  isActive: boolean;
};

const formatTime = (date: Date): string =>
  date.toLocaleTimeString('en-PH', {
    timeZone: PH_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const phDateKey = (date: Date): string =>
  date.toLocaleDateString('en-CA', { timeZone: PH_TZ });

const formatRelativeDay = (date: Date): string => {
  const today = phDateKey(new Date());
  const yesterday = phDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const key = phDateKey(date);
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  return date.toLocaleDateString('en-PH', {
    timeZone: PH_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const formatDuration = (hours: number | null, isActive: boolean): string => {
  if (isActive) return 'In progress';
  if (hours == null) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const statusBadge = (
  status?: ClockRecord['status'],
): { label: string; cls: string } | null => {
  if (!status || status === 'present') return null;
  if (status === 'late') return { label: 'Late', cls: 'bg-amber-100 text-amber-700' };
  if (status === 'very_late') return { label: 'Very late', cls: 'bg-orange-100 text-orange-700' };
  if (status === 'absent') return { label: 'Absent', cls: 'bg-red-100 text-red-700' };
  return null;
};

export default function ClockHistoryCard({
  records,
  isLoading,
  maxSessions = 5,
}: Props) {
  const sessions = useMemo<SessionRow[]>(() => {
    const out: SessionRow[] = [];
    // Sort records by date desc, then flatten clocks (most recent clock first)
    const sortedRecords = [...records].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    for (const record of sortedRecords) {
      const recordDate = new Date(record.date);
      const sortedClocks = [...(record.clocks ?? [])].sort(
        (a, b) => new Date(b.timeIn).getTime() - new Date(a.timeIn).getTime(),
      );
      for (const clock of sortedClocks) {
        const timeIn = new Date(clock.timeIn);
        const timeOut = clock.timeOut ? new Date(clock.timeOut) : null;
        out.push({
          recordId: record._id,
          date: recordDate,
          timeIn,
          timeOut,
          totalHours: clock.totalHours ?? null,
          status: clock.status,
          remarks: clock.remarks?.trim() || undefined,
          isActive: !timeOut,
        });
        if (out.length >= maxSessions) break;
      }
      if (out.length >= maxSessions) break;
    }
    return out;
  }, [records, maxSessions]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <WidgetSkeleton lines={5} />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Recent sessions</h3>
          <p className="mt-0.5 text-xs text-slate-500">Your latest clock in/outs</p>
        </div>
        <a href="/dtr" className="text-xs font-medium text-indigo-600 hover:underline">
          View full DTR →
        </a>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-center">
          <Timer className="h-7 w-7 text-slate-400" aria-hidden />
          <p className="mt-2 text-sm text-slate-600">No sessions yet</p>
          <p className="mt-1 text-xs text-slate-400">Clock in above to start tracking time.</p>
        </div>
      ) : (
        <ul className="-mx-2 space-y-1">
          {sessions.map((s, idx) => {
            const badge = statusBadge(s.status);
            return (
              <li key={`${s.recordId}-${idx}`}>
                <a
                  href="/dtr"
                  className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition hover:bg-slate-50"
                >
                  <span
                    className={`mt-1.5 flex h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                      s.isActive ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300'
                    }`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {formatRelativeDay(s.date)}
                        </p>
                        {badge && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <p className={`flex-shrink-0 text-sm font-semibold tabular-nums ${
                        s.isActive ? 'text-emerald-600' : 'text-slate-700'
                      }`}>
                        {formatDuration(s.totalHours, s.isActive)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-800 tabular-nums">
                      {formatTime(s.timeIn)}
                      <span className="mx-1.5 text-slate-400">→</span>
                      {s.timeOut ? formatTime(s.timeOut) : <span className="text-emerald-600 font-medium">Active</span>}
                    </p>
                    {s.remarks && (
                      <blockquote
                        className="mt-1.5 border-l-2 border-slate-200 pl-2 text-xs italic text-slate-600 group-hover:border-indigo-300"
                        title={s.remarks}
                      >
                        <span className="line-clamp-2">{s.remarks}</span>
                      </blockquote>
                    )}
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
