// frontend/src/features/offboarding/components/FeedbackAnalyticsPanel.tsx
//
// Wires into OffboardingDashboard.tsx's "Feedback Analytics" tab
// (visibleTo: 'admin'). Shows aggregated exit-survey analytics for the
// fixed fields (satisfaction, themes, would-recommend) plus a section per
// admin-authored custom question (see ExitSurveyQuestion.ts), and hosts the
// "Manage Exit Survey Questions" admin panel (ExitFeedbackQuestionManager)
// since there's no dedicated tab for question management.
//
// No charting library exists in this project (confirmed against
// package.json — no recharts/chart.js/d3), so all charts here are plain
// CSS bars. Export uses `xlsx` and `jspdf`, both already project
// dependencies.
//
// Department/batch filter dropdowns use the real departmentService and
// batchService (confirmed against their actual exports).

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import {
  getExitFeedbackAnalytics,
  getExitFeedbackExportRows,
} from "../../../services/exitFeedbackService";
import { departmentService } from "../../../services/departmentService";
import { batchService } from "../../../services/batchService";
import type {
  ExitFeedbackAnalytics,
  ExitFeedbackFilter,
  ExitFeedbackExportRow,
  CustomQuestionAnalytics,
} from "../../../types/exitFeedback";
import ExitFeedbackQuestionManager from "./ExitFeedbackQuestionManager";

type FilterOption = { id: string; name: string };

export default function FeedbackAnalyticsPanel() {
  const [analytics, setAnalytics] = useState<ExitFeedbackAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ExitFeedbackFilter>({});
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  const [departments, setDepartments] = useState<FilterOption[]>([]);
  const [batches, setBatches] = useState<FilterOption[]>([]);

  useEffect(() => {
    departmentService
      .getAllDepartments()
      .then((depts) =>
        setDepartments(depts.map((d: any) => ({ id: d._id, name: d.department_name }))),
      )
      .catch(() => {
        // Non-fatal: filters just stay empty if this fails, main
        // analytics load isn't blocked by it.
      });
    batchService
      .list("all")
      .then((bs) => setBatches(bs.map((b: any) => ({ id: b._id, name: b.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getExitFeedbackAnalytics(filter)
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load exit feedback analytics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const handleExportExcel = async () => {
    setExporting("xlsx");
    try {
      const rows = await getExitFeedbackExportRows(filter);
      const sheetRows = rows.map((r: ExitFeedbackExportRow) => ({
        "Submitted At": new Date(r.submitted_at).toLocaleString(),
        "Intern": r.intern_name,
        "Department": r.department,
        "Batch": r.batch,
        "Satisfaction (1-5)": r.satisfaction_rating,
        "Would Recommend": r.would_recommend === null ? "" : r.would_recommend ? "Yes" : "No",
        "Themes": r.feedback_themes.join(", "),
        "Comments": r.comments,
        "Custom Answers": r.custom_answers,
      }));
      const worksheet = XLSX.utils.json_to_sheet(sheetRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Exit Feedback");
      XLSX.writeFile(workbook, "exit-feedback-export.xlsx");
    } catch {
      setError("Export failed. Try again.");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExporting("pdf");
    try {
      const rows = await getExitFeedbackExportRows(filter);
      const doc = new jsPDF();
      const marginX = 14;
      let y = 16;

      doc.setFontSize(14);
      doc.text("Exit Feedback Report", marginX, y);
      y += 8;
      doc.setFontSize(9);
      doc.text(`Generated ${new Date().toLocaleString()}`, marginX, y);
      y += 8;

      if (analytics) {
        doc.text(`Total responses: ${analytics.total_responses}`, marginX, y);
        y += 5;
        doc.text(`Average satisfaction: ${analytics.average_satisfaction.toFixed(2)} / 5`, marginX, y);
        y += 5;
        if (analytics.would_recommend_rate !== null) {
          doc.text(`Would recommend: ${analytics.would_recommend_rate.toFixed(1)}%`, marginX, y);
          y += 5;
        }
        y += 4;
      }

      doc.setFontSize(10);
      for (const r of rows) {
        if (y > 270) {
          doc.addPage();
          y = 16;
        }
        const line = `${new Date(r.submitted_at).toLocaleDateString()} — ${r.intern_name} (${r.department}, ${r.batch}) — ${r.satisfaction_rating}/5`;
        doc.text(line, marginX, y);
        y += 5;
        if (r.comments) {
          const wrapped = doc.splitTextToSize(`  "${r.comments}"`, 180);
          doc.text(wrapped, marginX, y);
          y += wrapped.length * 5;
        }
        if (r.custom_answers) {
          const wrapped = doc.splitTextToSize(`  ${r.custom_answers}`, 180);
          doc.text(wrapped, marginX, y);
          y += wrapped.length * 5;
        }
        y += 2;
      }

      doc.save("exit-feedback-report.pdf");
    } catch {
      setError("Export failed. Try again.");
    } finally {
      setExporting(null);
    }
  };

  if (loading && !analytics) {
    return <div className="p-6 text-sm text-slate-500">Loading analytics…</div>;
  }

  if (error && !analytics) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  if (!analytics) return null;

  const distributionData = [1, 2, 3, 4, 5].map((n) => ({
    rating: n,
    count: analytics.satisfaction_distribution[n as 1 | 2 | 3 | 4 | 5],
  }));
  const maxCount = Math.max(1, ...distributionData.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Exit Feedback Analytics</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter.department_id ?? ""}
            onChange={(e) =>
              setFilter((f) => ({ ...f, department_id: e.target.value || undefined }))
            }
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={filter.batch_id ?? ""}
            onChange={(e) => setFilter((f) => ({ ...f, batch_id: e.target.value || undefined }))}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting !== null || analytics.total_responses === 0}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {exporting === "xlsx" ? "Exporting…" : "Export Excel"}
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting !== null || analytics.total_responses === 0}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
          >
            {exporting === "pdf" ? "Exporting…" : "Export PDF"}
          </button>
        </div>
      </div>

      <ExitFeedbackQuestionManager />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total responses" value={analytics.total_responses.toString()} />
        <StatCard
          label="Average satisfaction"
          value={`${analytics.average_satisfaction.toFixed(2)} / 5`}
        />
        <StatCard
          label="Would recommend"
          value={
            analytics.would_recommend_rate === null
              ? "—"
              : `${analytics.would_recommend_rate.toFixed(1)}%`
          }
        />
      </div>

      {/* Plain CSS bar chart — no charting library in this project. */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h4 className="mb-4 text-sm font-medium text-slate-700">Satisfaction distribution</h4>
        <div className="flex h-48 items-end gap-4 px-2">
          {distributionData.map((d) => (
            <div key={d.rating} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-medium text-slate-600">{d.count}</span>
              <div
                className="w-full rounded-t-md bg-indigo-600 transition-all"
                style={{
                  height: `${Math.max(4, (d.count / maxCount) * 100)}%`,
                }}
              />
              <span className="text-xs text-slate-500">{d.rating}★</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <h4 className="mb-3 text-sm font-medium text-slate-700">Common feedback themes</h4>
        {analytics.theme_frequency.length === 0 ? (
          <p className="text-sm text-slate-500">No themes reported yet.</p>
        ) : (
          <ul className="space-y-2">
            {analytics.theme_frequency.map((t) => (
              <li key={t.theme} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{t.theme}</span>
                <span className="font-medium text-slate-900">{t.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BreakdownTable
          title="By department"
          rows={analytics.by_department.map((d) => ({
            key: d.department_id,
            label:
              departments.find((opt) => opt.id === d.department_id)?.name ?? d.department_id,
            count: d.count,
            avg: d.average_satisfaction,
          }))}
        />
        <BreakdownTable
          title="By batch"
          rows={analytics.by_batch.map((b) => ({
            key: b.batch_id,
            label: batches.find((opt) => opt.id === b.batch_id)?.name ?? b.batch_id,
            count: b.count,
            avg: b.average_satisfaction,
          }))}
        />
      </div>

      {/* Per-question analytics for admin-authored questions. Only
          questions with at least one answer appear here (see
          getCustomQuestionAnalytics in exitFeedbackService.ts) — a brand
          new question with zero responses has nothing to show yet. */}
      {analytics.custom_questions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900">Custom Question Analytics</h3>
          {analytics.custom_questions.map((q) => (
            <CustomQuestionCard key={q.question_id} question={q} />
          ))}
        </div>
      )}
    </div>
  );
}

function CustomQuestionCard({ question }: { question: CustomQuestionAnalytics }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h4 className="mb-3 text-sm font-medium text-slate-700">
        {question.question_text}
        <span className="ml-2 text-xs font-normal text-slate-400">
          {question.response_count} response(s)
        </span>
      </h4>

      {question.type === "rating_scale" && question.distribution && (
        <div>
          <p className="mb-3 text-xs text-slate-500">
            Average: <span className="font-medium text-slate-800">{question.average?.toFixed(2)} / 5</span>
          </p>
          <div className="flex h-32 items-end gap-3 px-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const count = question.distribution![n as 1 | 2 | 3 | 4 | 5];
              const max = Math.max(1, ...Object.values(question.distribution!));
              return (
                <div key={n} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs text-slate-600">{count}</span>
                  <div
                    className="w-full rounded-t-md bg-indigo-500"
                    style={{ height: `${Math.max(4, (count / max) * 100)}%` }}
                  />
                  <span className="text-xs text-slate-500">{n}★</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {question.type === "multiple_choice" && question.option_frequency && (
        <ul className="space-y-2">
          {question.option_frequency.map((o) => (
            <li key={o.option} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{o.option}</span>
              <span className="font-medium text-slate-900">{o.count}</span>
            </li>
          ))}
        </ul>
      )}

      {question.type === "long_text" && question.responses && (
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {question.responses.length === 0 ? (
            <p className="text-sm text-slate-500">No responses yet.</p>
          ) : (
            question.responses.map((r, i) => (
              <p key={i} className="rounded-md bg-slate-50 p-2 text-sm text-slate-700">
                "{r}"
              </p>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; label: string; count: number; avg: number }[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h4 className="mb-3 text-sm font-medium text-slate-700">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No data yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="pb-2">Name</th>
              <th className="pb-2">Responses</th>
              <th className="pb-2">Avg. rating</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-slate-100">
                <td className="py-1.5 text-slate-600">{r.label}</td>
                <td className="py-1.5">{r.count}</td>
                <td className="py-1.5">{r.avg.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}