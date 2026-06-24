import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Eye,
  AlertCircle,
  LayoutList,
  Download,
  FileText,
  X,
} from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { taskService } from '../../services/taskService';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { StatCardSkeleton, TableRowSkeleton } from '../../components/ui/Skeleton';
import type { TaskAnalyticsParams, TaskAnalyticsResponse, TaskStatus } from '../../types/task';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: TaskStatus[] = [
  'Not Started',
  'In Progress',
  'Under Review',
  'Completed',
];

/** Returns a whole-number completion rate, or 0 when total is 0. */
const calcRate = (completed: number, total: number) =>
  total > 0 ? Math.round((completed / total) * 100) : 0;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MiniProgressBarProps {
  value: number; // 0–100
  colour?: string;
}

function MiniProgressBar({ value, colour = 'bg-blue-500' }: MiniProgressBarProps) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colour}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-700 tabular-nums w-8 text-right">
        {value}%
      </span>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  /** Tailwind text-colour class for the value */
  valueColour?: string;
  /** Optional content rendered below the value */
  footer?: React.ReactNode;
}

function MetricCard({ label, value, icon, valueColour = 'text-slate-900', footer }: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <span className="text-slate-300">{icon}</span>
      </div>
      <p className={`text-3xl font-bold tabular-nums ${valueColour}`}>{value}</p>
      {footer && <div>{footer}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TaskAnalyticsPage() {
  const [filters, setFilters] = useState<TaskAnalyticsParams>({});
  const [data,    setData]    = useState<TaskAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Data fetch — re-runs whenever filters change
  // -------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await taskService.getTaskAnalytics(filters);
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError('Failed to load analytics data. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [filters]);

  // -------------------------------------------------------------------------
  // Filter helpers
  // -------------------------------------------------------------------------

  const handleFilterChange = useCallback(
    (patch: Partial<TaskAnalyticsParams>) =>
      setFilters((prev) => ({ ...prev, ...patch })),
    [],
  );

  const hasActiveFilters =
    !!filters.startDate || !!filters.endDate || !!filters.status;

  const clearFilters = useCallback(() => setFilters({}), []);

  // -------------------------------------------------------------------------
  // Export — Option A: completionMetrics + assignee table only
  // -------------------------------------------------------------------------

  const buildReportPeriod = () => {
    if (filters.startDate && filters.endDate)
      return `${filters.startDate} to ${filters.endDate}`;
    if (filters.startDate) return `From ${filters.startDate}`;
    if (filters.endDate)   return `Until ${filters.endDate}`;
    return 'All Time';
  };

  const exportToPDF = () => {
    if (!data) return;
    const { completionMetrics: m, assigneePerformance: ap } = data;
    const rate = calcRate(m.completed, m.total);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let y = 15;

    doc.setFontSize(16);
    doc.text('Task Analytics Report', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Report Period: ${buildReportPeriod()}`, 15, y);
    if (filters.status) doc.text(`Status Filter: ${filters.status}`, pageWidth / 2, y);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 15, y, { align: 'right' });
    y += 10;

    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text('Completion Metrics', 15, y);
    y += 7;

    doc.setFontSize(10);
    const metricLines = [
      [`Total Tasks`,    String(m.total)],
      [`Completed`,      String(m.completed)],
      [`Pending`,        String(m.pending)],
      [`In Progress`,    String(m.inProgress)],
      [`Under Review`,   String(m.underReview)],
      [`Overdue`,        String(m.overdue)],
      [`Completion Rate`,`${rate}%`],
    ];
    metricLines.forEach(([label, val]) => {
      doc.text(label, 15, y);
      doc.text(val, 80, y);
      y += 6;
    });

    if (ap.length > 0) {
      y += 6;
      doc.setFontSize(12);
      doc.text('Assignee Performance', 15, y);
      y += 7;

      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text('Name', 15, y);
      doc.text('Assigned', 80, y);
      doc.text('Completed', 105, y);
      doc.text('Rate %', 135, y);
      doc.text('Overdue', 160, y);
      y += 5;
      doc.setDrawColor(200);
      doc.line(15, y, pageWidth - 15, y);
      y += 4;
      doc.setTextColor(0);

      ap.forEach((row) => {
        const rowRate = calcRate(row.completed, row.totalAssigned);
        doc.setFontSize(9);
        doc.text(row.name || '—', 15, y);
        doc.text(String(row.totalAssigned), 80, y);
        doc.text(String(row.completed), 105, y);
        doc.text(`${rowRate}%`, 135, y);
        doc.text(row.overdue > 0 ? String(row.overdue) : '—', 160, y);
        y += 6;

        if (y > 270) {
          doc.addPage();
          y = 15;
        }
      });
    }

    doc.save(`Task_Analytics_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    if (!data) return;
    const { completionMetrics: m, assigneePerformance: ap } = data;
    const rate = calcRate(m.completed, m.total);

    const workbook = XLSX.utils.book_new();

    // Sheet 1 — Completion Metrics
    const metricsSheet = XLSX.utils.aoa_to_sheet([
      ['Task Analytics Report'],
      ['Report Period', buildReportPeriod()],
      filters.status ? ['Status Filter', filters.status] : [],
      ['Generated', new Date().toLocaleDateString()],
      [],
      ['Metric', 'Value'],
      ['Total Tasks',    m.total],
      ['Completed',      m.completed],
      ['Pending',        m.pending],
      ['In Progress',    m.inProgress],
      ['Under Review',   m.underReview],
      ['Overdue',        m.overdue],
      ['Completion Rate %', rate],
    ].filter((row) => row.length > 0));
    metricsSheet['!cols'] = [{ wch: 22 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Summary');

    // Sheet 2 — Assignee Performance
    if (ap.length > 0) {
      const assigneeRows = ap.map((row) => [
        row.name,
        row.totalAssigned,
        row.completed,
        `${calcRate(row.completed, row.totalAssigned)}%`,
        row.overdue,
      ]);
      const assigneeSheet = XLSX.utils.aoa_to_sheet([
        ['Name', 'Assigned', 'Completed', 'Completion Rate', 'Overdue'],
        ...assigneeRows,
      ]);
      assigneeSheet['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(workbook, assigneeSheet, 'Assignee Performance');
    }

    XLSX.writeFile(workbook, `Task_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // -------------------------------------------------------------------------
  // Derived values (only when data is available)
  // -------------------------------------------------------------------------

  const rate = data ? calcRate(data.completionMetrics.completed, data.completionMetrics.total) : 0;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6 p-6">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Task Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Completion metrics and assignee performance — powered by live backend aggregation.
        </p>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">

          {/* Start Date */}
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label
              htmlFor="analytics-start-date"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Start Date
            </label>
            <Input
              id="analytics-start-date"
              type="date"
              value={filters.startDate ?? ''}
              max={filters.endDate}
              onChange={(e) =>
                handleFilterChange({ startDate: e.target.value || undefined })
              }
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label
              htmlFor="analytics-end-date"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              End Date
            </label>
            <Input
              id="analytics-end-date"
              type="date"
              value={filters.endDate ?? ''}
              min={filters.startDate}
              onChange={(e) =>
                handleFilterChange({ endDate: e.target.value || undefined })
              }
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label
              htmlFor="analytics-status"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Status
            </label>
            <select
              id="analytics-status"
              value={filters.status ?? ''}
              onChange={(e) =>
                handleFilterChange({
                  status: (e.target.value as TaskStatus) || undefined,
                })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900
                         bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="self-end text-slate-500 hover:text-slate-800"
            >
              <X size={14} />
              Clear
            </Button>
          )}

          {/* Export — pushed to the right */}
          <div className="flex gap-2 ml-auto self-end">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              disabled={!data || loading}
            >
              <Download size={14} />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={!data || loading}
            >
              <FileText size={14} />
              Export Excel
            </Button>
          </div>

        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Metric Cards ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            label="Total"
            value={data.completionMetrics.total}
            icon={<LayoutList size={20} />}
          />
          <MetricCard
            label="Completed"
            value={data.completionMetrics.completed}
            valueColour="text-emerald-600"
            icon={<CheckCircle2 size={20} className="text-emerald-400" />}
            footer={
              <MiniProgressBar value={rate} colour="bg-emerald-500" />
            }
          />
          <MetricCard
            label="Pending"
            value={data.completionMetrics.pending}
            valueColour="text-yellow-600"
            icon={<Clock size={20} className="text-yellow-400" />}
          />
          <MetricCard
            label="In Progress"
            value={data.completionMetrics.inProgress}
            valueColour="text-blue-600"
            icon={<TrendingUp size={20} className="text-blue-400" />}
          />
          <MetricCard
            label="Under Review"
            value={data.completionMetrics.underReview}
            valueColour="text-amber-600"
            icon={<Eye size={20} className="text-amber-400" />}
          />
          <MetricCard
            label="Overdue"
            value={data.completionMetrics.overdue}
            valueColour={data.completionMetrics.overdue > 0 ? 'text-red-600' : 'text-slate-400'}
            icon={<AlertCircle size={20} className={data.completionMetrics.overdue > 0 ? 'text-red-400' : 'text-slate-300'} />}
          />
        </div>
      ) : null}

      {/* ── Assignee Performance ──────────────────────────────────────── */}
      <Card title="Assignee Performance" subtitle="Task load and completion rate per user">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(5)].map((_, i) => (
              <TableRowSkeleton key={i} columnCount={5} />
            ))}
          </div>
        ) : data && data.assigneePerformance.length > 0 ? (
          <div className="overflow-x-auto -mx-6 -mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Assignee
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Assigned
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 min-w-[160px]">
                    Completion Rate
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Overdue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.assigneePerformance.map((row) => {
                  const rowRate = calcRate(row.completed, row.totalAssigned);
                  return (
                    <tr
                      key={row.userId}
                      className="group hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Name */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          {/* Avatar initials */}
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center
                                           rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                            {row.name
                              ? row.name.split(' ').map((n) => n[0]).slice(0, 2).join('')
                              : '?'}
                          </span>
                          <span className="font-medium text-slate-800">{row.name || '—'}</span>
                        </div>
                      </td>

                      {/* Assigned */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2
                                         rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                          {row.totalAssigned}
                        </span>
                      </td>

                      {/* Completed */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2
                                         rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700">
                          {row.completed}
                        </span>
                      </td>

                      {/* Completion rate bar */}
                      <td className="px-6 py-3.5">
                        <MiniProgressBar
                          value={rowRate}
                          colour={
                            rowRate >= 75
                              ? 'bg-emerald-500'
                              : rowRate >= 40
                                ? 'bg-blue-500'
                                : 'bg-amber-400'
                          }
                        />
                      </td>

                      {/* Overdue */}
                      <td className="px-4 py-3.5 text-center">
                        {row.overdue > 0 ? (
                          <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2
                                           rounded-full bg-red-50 text-xs font-semibold text-red-600">
                            {row.overdue}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs font-medium">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : !loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <LayoutList size={32} className="text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-500">No assignee data</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your date range or status filter.
            </p>
          </div>
        ) : null}
      </Card>

    </div>
  );
}