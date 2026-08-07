// frontend/src/features/offboarding/components/ExitFeedbackQuestionManager.tsx
//
// Admin-only question management UI, embedded as a collapsible section
// inside FeedbackAnalyticsPanel.tsx (no dedicated tab exists for this —
// Feedback Analytics is the only admin-only tab in OffboardingDashboard.tsx,
// so this reuses its existing role gating rather than adding a 10th tab).
//
// Lets an admin create new exit survey questions (long text / rating scale
// / multiple choice) and edit or deactivate existing ones. Once a question
// has answer_count > 0 (enforced server-side in exitFeedbackService.ts,
// updateExitSurveyQuestion), editing its content is blocked — only
// deactivating it remains possible. There is no delete: deactivating is the
// only removal path, so historical responses never lose their question.

import { useEffect, useState } from "react";
import {
  listExitSurveyQuestions,
  createExitSurveyQuestion,
  updateExitSurveyQuestion,
} from "../../../services/exitFeedbackService";
import type {
  ExitSurveyQuestion,
  ExitSurveyQuestionType,
  CreateExitSurveyQuestionInput,
} from "../../../types/exitFeedback";

const TYPE_LABELS: Record<ExitSurveyQuestionType, string> = {
  long_text: "Long text",
  rating_scale: "Rating scale (1-5)",
  multiple_choice: "Multiple choice",
};

const emptyDraft: CreateExitSurveyQuestionInput = {
  question_text: "",
  type: "long_text",
  options: [],
  required: true,
  display_order: 0,
};

export default function ExitFeedbackQuestionManager() {
  const [expanded, setExpanded] = useState(false);
  const [questions, setQuestions] = useState<ExitSurveyQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<CreateExitSurveyQuestionInput>(emptyDraft);
  const [optionInput, setOptionInput] = useState("");

  const loadQuestions = () => {
    setLoading(true);
    listExitSurveyQuestions(false)
      .then(setQuestions)
      .catch(() => setError("Couldn't load questions."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (expanded) loadQuestions();
  }, [expanded]);

  const addOption = () => {
    const trimmed = optionInput.trim();
    if (!trimmed || draft.options.includes(trimmed)) return;
    setDraft((d) => ({ ...d, options: [...d.options, trimmed] }));
    setOptionInput("");
  };

  const removeOption = (option: string) => {
    setDraft((d) => ({ ...d, options: d.options.filter((o) => o !== option) }));
  };

  const handleCreate = async () => {
    if (draft.question_text.trim().length < 5) {
      setError("Question text must be at least 5 characters.");
      return;
    }
    if (draft.type === "multiple_choice" && draft.options.length < 2) {
      setError("Multiple choice questions need at least 2 options.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createExitSurveyQuestion({
        ...draft,
        // A type other than multiple_choice must not carry options —
        // matches the model-level validation in ExitSurveyQuestion.ts.
        options: draft.type === "multiple_choice" ? draft.options : [],
      });
      setDraft(emptyDraft);
      setShowForm(false);
      loadQuestions();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to create question.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (question: ExitSurveyQuestion) => {
    setError(null);
    try {
      await updateExitSurveyQuestion(question._id, { is_active: !question.is_active });
      loadQuestions();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to update question.");
    }
  };

  return (
    <div className="rounded-lg border border-slate-200">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-slate-700">Manage Exit Survey Questions</span>
        <span className="text-xs text-slate-400">{expanded ? "Hide ▲" : "Show ▼"}</span>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-slate-200 p-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          {loading ? (
            <p className="text-sm text-slate-500">Loading questions…</p>
          ) : (
            <div className="space-y-2">
              {questions.length === 0 && (
                <p className="text-sm text-slate-500">No custom questions yet.</p>
              )}
              {questions.map((q) => {
                const locked = q.answer_count > 0;
                return (
                  <div
                    key={q._id}
                    className={`rounded-md border p-3 text-sm ${
                      q.is_active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`font-medium ${q.is_active ? "text-slate-900" : "text-slate-400"}`}>
                          {q.question_text}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {TYPE_LABELS[q.type]}
                          {q.type === "multiple_choice" && ` · ${q.options.join(", ")}`}
                          {q.required ? " · Required" : " · Optional"}
                          {locked && ` · ${q.answer_count} response(s) — locked`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(q)}
                        className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium ${
                          q.is_active
                            ? "border-slate-300 text-slate-600 hover:bg-slate-100"
                            : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {q.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              + Add question
            </button>
          ) : (
            <div className="space-y-3 rounded-md border border-slate-200 p-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Question text</label>
                <textarea
                  value={draft.question_text}
                  onChange={(e) => setDraft((d) => ({ ...d, question_text: e.target.value }))}
                  rows={2}
                  maxLength={500}
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
                  placeholder="e.g. What would you improve about the onboarding process?"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Answer type</label>
                <select
                  value={draft.type}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      type: e.target.value as ExitSurveyQuestionType,
                      options: [],
                    }))
                  }
                  className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="long_text">Long text</option>
                  <option value="rating_scale">Rating scale (1-5)</option>
                  <option value="multiple_choice">Multiple choice</option>
                </select>
              </div>

              {draft.type === "multiple_choice" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700">Options</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      value={optionInput}
                      onChange={(e) => setOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addOption();
                        }
                      }}
                      className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                      placeholder="Add an option and press Enter"
                    />
                    <button
                      type="button"
                      onClick={addOption}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {draft.options.map((option) => (
                      <span
                        key={option}
                        className="flex items-center gap-1 rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-700"
                      >
                        {option}
                        <button
                          type="button"
                          onClick={() => removeOption(option)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.required}
                  onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))}
                />
                Required
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save question"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setDraft(emptyDraft);
                  }}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}