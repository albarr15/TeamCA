// frontend/src/features/offboarding/components/ExitSurveyForm.tsx
//
// Intern-facing exit survey submission form. Rendered inside
// ExitChecklistPanel.tsx, only once all checklist requirements look
// complete (allComplete). Mirrors the ReadinessScorePanel pattern: fetch
// status on mount, show a blocked state with reasons if not eligible, show
// an "already submitted" state if done, otherwise render the form.
//
// UPDATED: now also fetches and renders admin-authored questions
// (backend/src/models/ExitSurveyQuestion.ts) below the fixed fields.
// Questions are fetched with ?active=true so a deactivated question never
// shows up here, even if it's still visible in the admin management view.

import { useEffect, useState } from "react";
import {
  getMyExitSurveyStatus,
  submitExitSurvey,
  listExitSurveyQuestions,
} from "../../../services/exitFeedbackService";
import type {
  ExitSurveyStatus,
  FeedbackTheme,
  ExitSurveyQuestion,
  CustomAnswerInput,
} from "../../../types/exitFeedback";
import { FEEDBACK_THEMES } from "../../../types/exitFeedback";

const RATING_LABELS: Record<number, string> = {
  1: "Very dissatisfied",
  2: "Dissatisfied",
  3: "Neutral",
  4: "Satisfied",
  5: "Very satisfied",
};

export default function ExitSurveyForm() {
  const [status, setStatus] = useState<ExitSurveyStatus | null>(null);
  const [questions, setQuestions] = useState<ExitSurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [rating, setRating] = useState<number>(0);
  const [themes, setThemes] = useState<FeedbackTheme[]>([]);
  const [comments, setComments] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  // question_id -> answer (string for long_text/multiple_choice, number for rating_scale)
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | number>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyExitSurveyStatus(), listExitSurveyQuestions(true)])
      .then(([s, q]) => {
        if (cancelled) return;
        setStatus(s);
        setQuestions(q);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your exit survey status. Try refreshing.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTheme = (theme: FeedbackTheme) => {
    setThemes((prev) =>
      prev.includes(theme) ? prev.filter((t) => t !== theme) : [...prev, theme],
    );
  };

  const setCustomAnswer = (questionId: string, value: string | number) => {
    setCustomAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      setError("Please select a satisfaction rating.");
      return;
    }
    const missingRequired = questions.filter(
      (q) => q.required && customAnswers[q._id] === undefined,
    );
    if (missingRequired.length > 0) {
      setError(`Please answer: "${missingRequired[0].question_text}"`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const custom_answers: CustomAnswerInput[] = Object.entries(customAnswers).map(
        ([question_id, answer]) => ({ question_id, answer }),
      );
      await submitExitSurvey({
        satisfaction_rating: rating,
        feedback_themes: themes,
        comments: comments.trim() || undefined,
        would_recommend: wouldRecommend ?? undefined,
        custom_answers,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to submit your exit survey.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading exit survey…</div>;
  }

  if (error && !status) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  if (submitted || status?.already_submitted) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <h3 className="font-semibold text-emerald-800">Thanks for your feedback</h3>
        <p className="mt-1 text-sm text-emerald-700">
          Your exit survey has been submitted. We appreciate you taking the time.
        </p>
      </div>
    );
  }

  if (status && !status.eligible) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h3 className="font-semibold text-amber-800">Exit survey not yet available</h3>
        <p className="mt-1 text-sm text-amber-700">
          The exit survey opens once your offboarding requirements are complete.
        </p>
        {status.blockers.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-700">
            {status.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6 rounded-lg border border-slate-200 p-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Exit Survey</h3>
        <p className="mt-1 text-sm text-slate-500">
          Your feedback helps improve the internship program for future interns.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Overall, how satisfied were you with your internship?
        </label>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                rating === n
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 text-slate-700 hover:border-indigo-400"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="mt-1 text-xs text-slate-500">{RATING_LABELS[rating]}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          What stood out during your internship? (select any that apply)
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {FEEDBACK_THEMES.map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => toggleTheme(theme)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                themes.includes(theme)
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-slate-300 text-slate-600 hover:border-indigo-400"
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Would you recommend this internship to others?
        </label>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setWouldRecommend(true)}
            className={`rounded-md border px-4 py-2 text-sm ${
              wouldRecommend === true
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-300 text-slate-700 hover:border-emerald-400"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setWouldRecommend(false)}
            className={`rounded-md border px-4 py-2 text-sm ${
              wouldRecommend === false
                ? "border-slate-600 bg-slate-600 text-white"
                : "border-slate-300 text-slate-700 hover:border-slate-400"
            }`}
          >
            No
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Anything else you'd like to share? (optional)
        </label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          maxLength={2000}
          rows={4}
          className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
          placeholder="Share any additional thoughts..."
        />
      </div>

      {/* Admin-authored questions, rendered dynamically by type. */}
      {questions.length > 0 && (
        <div className="space-y-5 border-t border-slate-200 pt-5">
          {questions.map((q) => (
            <div key={q._id}>
              <label className="block text-sm font-medium text-slate-700">
                {q.question_text}
                {q.required && <span className="ml-1 text-red-500">*</span>}
              </label>

              {q.type === "long_text" && (
                <textarea
                  value={(customAnswers[q._id] as string) ?? ""}
                  onChange={(e) => setCustomAnswer(q._id, e.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
                  placeholder="Your answer..."
                />
              )}

              {q.type === "rating_scale" && (
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCustomAnswer(q._id, n)}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                        customAnswers[q._id] === n
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-300 text-slate-700 hover:border-indigo-400"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "multiple_choice" && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setCustomAnswer(q._id, option)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        customAnswers[q._id] === option
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-300 text-slate-600 hover:border-indigo-400"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || rating < 1}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Exit Survey"}
      </button>
    </div>
  );
}