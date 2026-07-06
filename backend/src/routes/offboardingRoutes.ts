// file: backend/src/routes/offboardingRoutes.ts
import { Router } from "express";
import authenticateJWT from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { requestLock } from "../middlewares/requestLock.js";
import {
  listOffboardingDriveLinksHandler,
  submitDriveLinkHandler,
  reviewDriveLinkHandler,
} from "../controllers/offboardingController.js";
import {
  addDriveLinkSchema,
  reviewDriveLinkSchema,
} from "../schemas/taskSchemas.js";

const router = Router();

// All offboarding routes require a valid JWT.
router.use(authenticateJWT);

// GET /offboarding/drive-links
// List all Google Drive deliverable links accessible to the current user.
router.get("/drive-links", listOffboardingDriveLinksHandler);

// POST /offboarding/drive-links
// Submit a new Google Drive deliverable link for a task.
router.post(
  "/drive-links",
  validateRequest({ body: addDriveLinkSchema }),
  submitDriveLinkHandler,
);

// PATCH /offboarding/drive-links/:workLinkId/review
// Approve or reject a Google Drive deliverable link.
router.patch(
  "/drive-links/:workLinkId/review",
  requestLock,
  validateRequest({ body: reviewDriveLinkSchema }),
  reviewDriveLinkHandler,
);

export default router;
