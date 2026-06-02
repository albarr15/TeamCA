import { useEffect, useState } from 'react';
import Card from '../ui/Card';
import { WidgetSkeleton } from '../ui/Skeleton';
import { batchService } from '../../services/batchService';
import type { Batch } from '../../types/batch';

export default function BatchesBriefWidget() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    batchService
      .list('all')
      .then((items) => {
        if (cancelled) return;
        setBatches(items.filter((b) => !b.is_archived));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <WidgetSkeleton lines={4} />;
  }

  const active = batches.filter((b) => b.effective_status === 'Active');
  const completed = batches.filter((b) => b.effective_status === 'Completed');

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Internship Batches
          </h3>
          <p className="mt-1 text-xs text-slate-500">Active vs completed cycles</p>
        </div>
        <a href="/batches" className="text-xs font-medium text-indigo-600 hover:underline">
          Manage →
        </a>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-emerald-50 p-3">
          <p className="text-xs font-medium text-emerald-700">Active</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-800">
            {active.length}
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-700">Completed</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-800">
            {completed.length}
          </p>
        </div>
      </div>

      {active.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-500">Active now</p>
          <ul className="mt-1 space-y-1 text-sm text-slate-700">
            {active.slice(0, 3).map((b) => (
              <li key={b.batch_id} className="flex items-center justify-between">
                <span className="truncate">{b.name}</span>
                <span className="text-xs text-slate-400">{b.member_count} interns</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
