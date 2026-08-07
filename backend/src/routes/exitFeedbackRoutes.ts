// file: backend/src/routes/offboardingRoutes.ts
import { Router } from "express";
import authenticateJWT from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { requestLock } from "../middlewares/requestLock.js";
import { requireAnyRole } from "../middlewares/rbac.js";
import {
  listOffboardingDriveLinksHandler,
  submitDriveLinkHandler,
  reviewDriveLinkHandler,
  approveOffboardingHandler,
  listOffboardingCandidatesHandler,
  getMyClearanceTimelineHandler,
  getClearanceTimelineHandler,
  getMyReadinessScoreHandler,
  getReadinessScoreHandler,
} from "../controllers/offboardingController.js";
import {
  addDriveLinkSchema,
  reviewDriveLinkSchema,
  listDriveLinksQuerySchema,
} from "../schemas/taskSchemas.js";
import { clearanceTimelineQuerySchema } from "../schemas/clearanceSchemas.js";
import {
  createExtensionRequestHandler,
  getMyExtensionRequestsHandler,
  getPendingExtensionRequestsHandler,
  reviewExtensionRequestHandler,
  cancelExtensionRequestHandler,
} from "../controllers/extensionController.js";
import {
  createExtensionRequestSchema,
  reviewExtensionRequestSchema,
  listExtensionRequestsQuerySchema,
} from "../schemas/extensionSchemas.js";
import {
  submitExitSurveyHandler,
  getMyExitSurveyStatusHandler,
  getExitFeedbackAnalyticsHandler,
  getExitFeedbackExportHandler,
  createExitSurveyQuestionHandler,
  updateExitSurveyQuestionHandler,
  listExitSurveyQuestionsHandler,
} from "../controllers/exitFeedbackController.js";
import {
  submitExitSurveySchema,
  exitFeedbackAnalyticsQuerySchema,
  createExitSurveyQuestionSchema,
  updateExitSurveyQuestionSchema,
} from "../schemas/exitFeedbackSchemas.js";

const router = Router();

// All offboarding routes require a valid JWT.
router.use(authenticateJWT);

// GET /offboarding/drive-links
// List all Google Drive deliverable links accessible to the current user.
// Supports optional query filters: ?departmentId=<id>&status=<status>
router.get(
  "/drive-links",
  validateRequest({ query: listDriveLinksQuerySchema }),
  listOffboardingDriveLinksHandler,
);

// Reviewer queue and terminal approval. Approval validates the complete
// internship exit requirements and automatically archives the intern.
router.get(
  "/candidates",
  requireAnyRole(["Superadmin", "Admin"], ["Head", "Supervisor"]),
  listOffboardingCandidatesHandler,
);
router.post(
  "/:userId/approve",
  requestLock,
  requireAnyRole(["Superadmin", "Admin"], ["Head", "Supervisor"]),
  approveOffboardingHandler,
);

// ---------------------------------------------------------------------------
// Internship Completion Readiness Score
// ---------------------------------------------------------------------------
// Weighted progress percentage (hours, tasks, attendance, deliverables)
// shown on the intern dashboard. Distinct from the strict pass/fail gate
// used by /:userId/approve above.

// GET /offboarding/readiness-score/me
// The authenticated intern's own readiness score.
router.get("/readiness-score/me", getMyReadinessScoreHandler);

// GET /offboarding/readiness-score/:userId
// A reviewer's view of a specific intern's readiness score.
router.get(
  "/readiness-score/:userId",
  requireAnyRole(["Superadmin", "Admin"], ["Head", "Supervisor"]),
  getReadinessScoreHandler,
);

// POST /offboarding/drive-links
// Submit a new Google Drive deliverable link for a task.
router.post(
  "/drive-links",
  validateRequest({ body: addDriveLinkSchema }),
  submitDriveLinkHandler,
);

// PATCH /offboarding/drive-links/:workLinkId/review
// Approve, reject, or request revisions on a Google Drive deliverable link.
// Restricted to Supervisors, Heads, Admins, and Superadmins at the route level.
router.patch(
  "/drive-links/:workLinkId/review",
  requestLock,
  requireAnyRole(["Superadmin", "Admin"], ["Head", "Supervisor"]),
  validateRequest({ body: reviewDriveLinkSchema }),
  reviewDriveLinkHandler,
);

// ---------------------------------------------------------------------------
// Internship Extension Requests
// ---------------------------------------------------------------------------

// POST /offboarding/extension-requests
// File a new extension request — for yourself, or (if you're a Head/
// Supervisor/Admin/Superadmin) on behalf of an intern in your scope.
router.post(
  "/extension-requests",
  validateRequest({ body: createExtensionRequestSchema }),
  createExtensionRequestHandler,
);

// GET /offboarding/extension-requests/me
// List the authenticated intern's own extension request history.
router.get("/extension-requests/me", getMyExtensionRequestsHandler);

// GET /offboarding/extension-requests/pending
// List the reviewer's pending queue (Admins/Superadmins: all; Heads/
// Supervisors: department-scoped). Supports ?departmentId= for admins.
router.get(
  "/extension-requests/pending",
  requireAnyRole(["Superadmin", "Admin"], ["Head", "Supervisor"]),
  validateRequest({ query: listExtensionRequestsQuerySchema }),
  getPendingExtensionRequestsHandler,
);

// PATCH /offboarding/extension-requests/:requestId/review
// Approve or reject a pending extension request.
// Body: { status: "approved" | "rejected", remarks?: string }
// (remarks required when rejecting)
router.patch(
  "/extension-requests/:requestId/review",
  requestLock,
  requireAnyRole(["Superadmin", "Admin"], ["Head", "Supervisor"]),
  validateRequest({ body: reviewExtensionRequestSchema }),
  reviewExtensionRequestHandler,
);

// PATCH /offboarding/extension-requests/:requestId/cancel
// Cancel your own pending extension request (requester or target intern).
router.patch(
  "/extension-requests/:requestId/cancel",
  requestLock,
  cancelExtensionRequestHandler,
);

// ---------------------------------------------------------------------------
// Clearance Approval Timeline
// ---------------------------------------------------------------------------
// Unified, chronological history of every clearance action taken on an
// intern's offboarding: deliverable reviews, extension request reviews, and
// the terminal clearance approve/reject decision. Supports
// ?status=rejected|revision_requested to filter down to only those actions.

// GET /offboarding/clearance-timeline/me
// The authenticated intern's own clearance timeline.
router.get(
  "/clearance-timeline/me",
  validateRequest({ query: clearanceTimelineQuerySchema }),
  getMyClearanceTimelineHandler,
);

// GET /offboarding/clearance-timeline/:userId
// A reviewer's view of a specific intern's clearance timeline. Scoped to
// Heads/Supervisors within their department, and unrestricted for
// Admins/Superadmins (enforced in the service layer).
router.get(
  "/clearance-timeline/:userId",
  requireAnyRole(["Superadmin", "Admin"], ["Head", "Supervisor"]),
  validateRequest({ query: clearanceTimelineQuerySchema }),
  getClearanceTimelineHandler,
);

// ---------------------------------------------------------------------------
// Exit Feedback (Exit Survey + Analytics)
// ---------------------------------------------------------------------------
// Intern-facing submission, gated by the same strict readiness check used
// by /:userId/approve above (offboardingApprovalService.getReadiness()) —
// not the weighted readiness-score percentage used for the dashboard
// display metric. Analytics/export are Admin/Superadmin only, matching the
// Feedback Analytics tab's visibility rule on the frontend.

// POST /offboarding/exit-feedback/submit
// Submit the authenticated intern's own exit survey. One-time; blocked
// until offboarding readiness requirements are fully met.
router.post(
  "/exit-feedback/submit",
  requestLock,
  validateRequest({ body: submitExitSurveySchema }),
  submitExitSurveyHandler,
);

// GET /offboarding/exit-feedback/me/status
// The authenticated intern's own eligibility + submission status.
router.get("/exit-feedback/me/status", getMyExitSurveyStatusHandler);

// GET /offboarding/exit-feedback/analytics
// Aggregated satisfaction/theme analytics. Supports
// ?department_id=&batch_id=&from=&to=
router.get(
  "/exit-feedback/analytics",
  requireAnyRole(["Superadmin", "Admin"]),
  validateRequest({ query: exitFeedbackAnalyticsQuerySchema }),
  getExitFeedbackAnalyticsHandler,
);

// GET /offboarding/exit-feedback/export
// Flat per-response rows for PDF/Excel export. Same filters as analytics.
router.get(
  "/exit-feedback/export",
  requireAnyRole(["Superadmin", "Admin"]),
  validateRequest({ query: exitFeedbackAnalyticsQuerySchema }),
  getExitFeedbackExportHandler,
);

// ---------------------------------------------------------------------------
// Exit Feedback — Question Management
// ---------------------------------------------------------------------------
// Admin-authored questions layered on top of the fixed satisfaction/theme
// fields above. Once a question has any answers (answer_count > 0), it's
// locked: question_text/type/options/required become immutable and only
// is_active can still change. There is no delete endpoint by design — old
// responses always keep the question text/type they were answered against,
// via the snapshot stored on each ExitSurvey.custom_answers entry.

// GET /offboarding/exit-feedback/questions
// Admin management view: all questions, active or not.
// GET /offboarding/exit-feedback/questions?active=true
// Intern-facing view: only questions currently shown on the form.
router.get(
  "/exit-feedback/questions",
  listExitSurveyQuestionsHandler,
);

// POST /offboarding/exit-feedback/questions
// Create a new question. Admin/Superadmin only.
router.post(
  "/exit-feedback/questions",
  requestLock,
  requireAnyRole(["Superadmin", "Admin"]),
  validateRequest({ body: createExitSurveyQuestionSchema }),
  createExitSurveyQuestionHandler,
);

// PATCH /offboarding/exit-feedback/questions/:questionId
// Edit a question, or toggle is_active. Admin/Superadmin only. Rejected
// with a 400 if the question is locked and a locked field is being changed.
router.patch(
  "/exit-feedback/questions/:questionId",
  requestLock,
  requireAnyRole(["Superadmin", "Admin"]),
  validateRequest({ body: updateExitSurveyQuestionSchema }),
  updateExitSurveyQuestionHandler,
);

export default router;