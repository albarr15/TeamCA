import type { Request, Response } from "express";
import {
  submitExitSurvey,
  getExitSurveyStatus,
  getExitFeedbackAnalytics,
  getExitFeedbackExportRows,
  createExitSurveyQuestion,
  updateExitSurveyQuestion,
  listExitSurveyQuestions,
  type ExitFeedbackFilter,
} from "../services/exitFeedbackService.js";

// authenticateJWT is already applied once for the whole router in
// offboardingRoutes.ts (router.use(authenticateJWT)), so req.user is
// guaranteed populated by the time any handler here runs.

const parseFilter = (req: Request): ExitFeedbackFilter => {
  const { department_id, batch_id, from, to } = req.query;
  return {
    department_id: typeof department_id === "string" ? department_id : undefined,
    batch_id: typeof batch_id === "string" ? batch_id : undefined,
    from: typeof from === "string" ? new Date(from) : undefined,
    to: typeof to === "string" ? new Date(to) : undefined,
  };
};

// ── Submission (intern) ──────────────────────────────────────────────────

export const submitExitSurveyHandler = async (req: Request, res: Response) => {
  try {
    const survey = await submitExitSurvey(req.user!, req.body);
    res.status(201).json(survey);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Failed to submit exit survey." });
  }
};

export const getMyExitSurveyStatusHandler = async (req: Request, res: Response) => {
  try {
    const status = await getExitSurveyStatus(String(req.user!.user_id));
    res.json(status);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Failed to fetch exit survey status." });
  }
};

// ── Analytics / export (admin) ───────────────────────────────────────────

export const getExitFeedbackAnalyticsHandler = async (req: Request, res: Response) => {
  try {
    const analytics = await getExitFeedbackAnalytics(parseFilter(req));
    res.json(analytics);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Failed to fetch exit feedback analytics." });
  }
};

// Returns row data for client-side export, or as input to a server-side
// PDF/Excel generator.
export const getExitFeedbackExportHandler = async (req: Request, res: Response) => {
  try {
    const rows = await getExitFeedbackExportRows(parseFilter(req));
    res.json({ rows });
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Failed to export exit feedback." });
  }
};

// ── Question management (admin) ──────────────────────────────────────────

export const createExitSurveyQuestionHandler = async (req: Request, res: Response) => {
  try {
    const question = await createExitSurveyQuestion(req.body);
    res.status(201).json(question);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Failed to create question." });
  }
};

export const updateExitSurveyQuestionHandler = async (req: Request, res: Response) => {
  try {
    const question = await updateExitSurveyQuestion(req.params.questionId, req.body);
    res.json(question);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Failed to update question." });
  }
};

// Admin management view (?active=true to filter) and the intern-facing form
// both use this same handler — the intern form should always pass
// ?active=true so it never renders a deactivated question.
export const listExitSurveyQuestionsHandler = async (req: Request, res: Response) => {
  try {
    const isAdmin =
      req.user!.global_role === "Admin" || req.user!.global_role === "Superadmin";
    // Only Admin/Superadmin may see the unfiltered list (inactive/locked
    // questions included). Everyone else — interns loading the survey form
    // — is forced onto active=true server-side, regardless of what query
    // param they actually sent. This closes the gap where a non-admin could
    // previously call this endpoint without ?active=true and see the full
    // question list.
    const activeOnly = isAdmin ? req.query.active === "true" : true;
    const questions = await listExitSurveyQuestions({ activeOnly });
    res.json(questions);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Failed to list questions." });
  }
};