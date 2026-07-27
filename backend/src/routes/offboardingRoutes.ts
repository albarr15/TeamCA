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

export default router;