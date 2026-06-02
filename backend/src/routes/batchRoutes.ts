import { Router } from "express";
import {
  addBatchMembersHandler,
  archiveBatchHandler,
  createBatchHandler,
  getBatchHandler,
  listAssignedUserIdsHandler,
  listBatchMembersHandler,
  listBatchesHandler,
  removeBatchMemberHandler,
  restoreBatchHandler,
  updateBatchHandler,
  updateBatchMemberHandler,
} from "../controllers/batchController.js";
import authenticateJWT from "../middlewares/auth.js";
import { requireGlobalRole } from "../middlewares/rbac.js";

const router = Router();

router.get("/", authenticateJWT, listBatchesHandler);
router.get("/assigned-user-ids", authenticateJWT, listAssignedUserIdsHandler);
router.get("/:batchId", authenticateJWT, getBatchHandler);
router.get("/:batchId/members", authenticateJWT, listBatchMembersHandler);

router.post(
  "/",
  authenticateJWT,
  requireGlobalRole("Superadmin", "Admin"),
  createBatchHandler,
);
router.patch(
  "/:batchId",
  authenticateJWT,
  requireGlobalRole("Superadmin", "Admin"),
  updateBatchHandler,
);
router.post(
  "/:batchId/archive",
  authenticateJWT,
  requireGlobalRole("Superadmin", "Admin"),
  archiveBatchHandler,
);
router.post(
  "/:batchId/restore",
  authenticateJWT,
  requireGlobalRole("Superadmin", "Admin"),
  restoreBatchHandler,
);
router.post(
  "/:batchId/members",
  authenticateJWT,
  requireGlobalRole("Superadmin", "Admin"),
  addBatchMembersHandler,
);
router.patch(
  "/:batchId/members/:userId",
  authenticateJWT,
  requireGlobalRole("Superadmin", "Admin"),
  updateBatchMemberHandler,
);
router.delete(
  "/:batchId/members/:userId",
  authenticateJWT,
  requireGlobalRole("Superadmin", "Admin"),
  removeBatchMemberHandler,
);

export default router;
