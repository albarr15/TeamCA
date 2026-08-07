// frontend/src/types/exitFeedback.ts
//
// Types for the Exit Feedback feature (Offboarding Hub → "Feedback
// Analytics" admin tab + intern-facing exit survey inside "Exit Checklist").
// Mirrors backend/src/models/ExitSurvey.ts, ExitSurveyQuestion.ts, and
// backend/src/services/exitFeedbackService.ts return shapes.

export const FEEDBACK_THEMES = [
  "Mentorship",
  "Workload",
  "Communication",
  "Learning Opportunities",
  "Work Environment",
  "Tools & Resources",
  "Task Clarity",
  "Career Growth",
] as const;

export type FeedbackTheme = (typeof FEEDBACK_THEMES)[number];

// ── Admin-authored questions ───────────────────────────────────────────────
// "multiple_choice" is single-select (pick one option), matching how
// feedback_themes is already aggregated as a frequency count.

export type ExitSurveyQuestionType = "long_text" | "rating_scale" | "multiple_choice";

export type ExitSurveyQuestion = {
  _id: string;
  question_text: string;
  type: ExitSurveyQuestionType;
  options: string[]; // only meaningful when type === "multiple_choice"
  required: boolean;
  is_active: boolean;
  // Once > 0, question_text/type/options/required are locked server-side —
  // only is_active can still change.
  answer_count: number;
  display_order: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateExitSurveyQuestionInput = {
  question_text: string;
  type: ExitSurveyQuestionType;
  options: string[];
  required: boolean;
  display_order: number;
};

export type UpdateExitSurveyQuestionInput = Partial<CreateExitSurveyQuestionInput> & {
  is_active?: boolean;
};

// ── Submission ───────────────────────────────────────────────────────────

export type CustomAnswerInput = {
  question_id: string;
  answer: string | number; // string for long_text/multiple_choice, number (1-5) for rating_scale
};

export type ExitSurveySubmission = {
  satisfaction_rating: number; // 1-5
  feedback_themes: FeedbackTheme[];
  comments?: string;
  would_recommend?: boolean;
  custom_answers: CustomAnswerInput[];
};

export type ExitSurveyCustomAnswer = {
  question_id: string;
  question_text_snapshot: string;
  question_type_snapshot: ExitSurveyQuestionType;
  answer: string | number;
};

export type ExitSurvey = Omit<ExitSurveySubmission, "custom_answers"> & {
  _id: string;
  user_id: string;
  batch_id: string;
  department_id: string;
  custom_answers: ExitSurveyCustomAnswer[];
  submitted_at: string;
  createdAt: string;
  updatedAt: string;
};

export type ExitSurveyStatus = {
  eligible: boolean;
  blockers: string[];
  already_submitted: boolean;
};

// ── Analytics ────────────────────────────────────────────────────────────

export type ExitFeedbackFilter = {
  department_id?: string;
  batch_id?: string;
  from?: string; // ISO date
  to?: string; // ISO date
};

export type SatisfactionDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

export type CustomQuestionAnalytics = {
  question_id: string;
  question_text: string;
  type: ExitSurveyQuestionType;
  response_count: number;
  // rating_scale only:
  average?: number;
  distribution?: SatisfactionDistribution;
  // multiple_choice only:
  option_frequency?: { option: string; count: number }[];
  // long_text only:
  responses?: string[];
};

export type ExitFeedbackAnalytics = {
  total_responses: number;
  average_satisfaction: number;
  satisfaction_distribution: SatisfactionDistribution;
  would_recommend_rate: number | null;
  theme_frequency: { theme: FeedbackTheme; count: number }[];
  by_department: { department_id: string; average_satisfaction: number; count: number }[];
  by_batch: { batch_id: string; average_satisfaction: number; count: number }[];
  custom_questions: CustomQuestionAnalytics[];
};

export type ExitFeedbackExportRow = {
  submitted_at: string;
  intern_name: string;
  department: string;
  batch: string;
  satisfaction_rating: number;
  would_recommend: boolean | null;
  feedback_themes: FeedbackTheme[];
  comments: string;
  custom_answers: string; // flattened "Question: Answer | Question: Answer"
};