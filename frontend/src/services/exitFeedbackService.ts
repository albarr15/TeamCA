// frontend/src/services/exitFeedbackService.ts
//
// Thin API client for the Exit Feedback feature. Wraps the endpoints added
// to backend/src/routes/offboardingRoutes.ts under /exit-feedback/*.
// BASE has no leading /api — the shared `api` axios instance (./api)
// already prefixes every call with http://localhost:3000/api.

import api from "./api";
import type {
  ExitSurvey,
  ExitSurveySubmission,
  ExitSurveyStatus,
  ExitFeedbackFilter,
  ExitFeedbackAnalytics,
  ExitFeedbackExportRow,
  ExitSurveyQuestion,
  CreateExitSurveyQuestionInput,
  UpdateExitSurveyQuestionInput,
} from "../types/exitFeedback";

const BASE = "/offboarding/exit-feedback";

// ── Submission (intern) ─────────────────────────────────────────────────

export const submitExitSurvey = async (
  payload: ExitSurveySubmission,
): Promise<ExitSurvey> => {
  const res = await api.post(`${BASE}/submit`, payload);
  return res.data;
};

export const getMyExitSurveyStatus = async (): Promise<ExitSurveyStatus> => {
  const res = await api.get(`${BASE}/me/status`);
  return res.data;
};

// ── Questions ────────────────────────────────────────────────────────────

// Pass activeOnly=true for the intern-facing form; omit (or false) for the
// admin management view, which needs to see inactive/locked questions too.
export const listExitSurveyQuestions = async (
  activeOnly = false,
): Promise<ExitSurveyQuestion[]> => {
  const res = await api.get(`${BASE}/questions`, {
    params: activeOnly ? { active: "true" } : {},
  });
  return res.data;
};

export const createExitSurveyQuestion = async (
  input: CreateExitSurveyQuestionInput,
): Promise<ExitSurveyQuestion> => {
  const res = await api.post(`${BASE}/questions`, input);
  return res.data;
};

export const updateExitSurveyQuestion = async (
  questionId: string,
  input: UpdateExitSurveyQuestionInput,
): Promise<ExitSurveyQuestion> => {
  const res = await api.patch(`${BASE}/questions/${questionId}`, input);
  return res.data;
};

// ── Analytics / export (admin) ───────────────────────────────────────────

const toQueryParams = (filter: ExitFeedbackFilter) => {
  const params: Record<string, string> = {};
  if (filter.department_id) params.department_id = filter.department_id;
  if (filter.batch_id) params.batch_id = filter.batch_id;
  if (filter.from) params.from = filter.from;
  if (filter.to) params.to = filter.to;
  return params;
};

export const getExitFeedbackAnalytics = async (
  filter: ExitFeedbackFilter = {},
): Promise<ExitFeedbackAnalytics> => {
  const res = await api.get(`${BASE}/analytics`, { params: toQueryParams(filter) });
  return res.data;
};

export const getExitFeedbackExportRows = async (
  filter: ExitFeedbackFilter = {},
): Promise<ExitFeedbackExportRow[]> => {
  const res = await api.get(`${BASE}/export`, { params: toQueryParams(filter) });
  return res.data.rows;
};