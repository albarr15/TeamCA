// backend/src/routes/certificateRoutes.ts
//
// Admin-facing certificate management. Kept as its own router (not folded
// into offboardingRoutes.ts) purely so it stays clearly separate from
// certificateVerificationRoutes.ts, which is public and must never
// accidentally inherit auth middleware from a shared router.
//
// Mount inside backend/src/routes/index.ts (the aggregator router that
// index.ts itself mounts at app.use("/api", _apiLimiter, routes)):
//   import certificateRoutes from "./certificateRoutes.js";
//   router.use("/certificates", certificateRoutes);
// This makes every route below reachable at /api/certificates/...

import { Router } from "express";
import authenticateJWT from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { requestLock } from "../middlewares/requestLock.js";
import { requireAnyRole } from "../middlewares/rbac.js";
import {
  issueCertificateHandler,
  revokeCertificateHandler,
  listCertificatesHandler,
  listCertificateEligibleInternsHandler,
  listCertificateLogsHandler,
} from "../controllers/certificateAdminController.js";
import { issueCertificateSchema, revokeCertificateSchema } from "../schemas/certificateSchemas.js";

const router = Router();

router.use(authenticateJWT);
router.use(requireAnyRole(["Superadmin", "Admin"]));

// GET /certificates
// List all issued certificates (active and revoked).
router.get("/", listCertificatesHandler);

// GET /certificates/eligible-interns
// Interns whose offboarding is completed but who don't yet have a
// certificate issued for that batch.
router.get("/eligible-interns", listCertificateEligibleInternsHandler);

// GET /certificates/logs
// Full issuance/revocation audit log.
router.get("/logs", listCertificateLogsHandler);

// POST /certificates/issue
// Issue a certificate for an intern whose offboarding is already approved
// (BatchAssignment.status === "Completed"). Body: { user_id }
router.post(
  "/issue",
  requestLock,
  validateRequest({ body: issueCertificateSchema }),
  issueCertificateHandler,
);

// PATCH /certificates/:certificateId/revoke
// Invalidate a previously issued certificate. Body: { reason?: string }
router.patch(
  "/:certificateId/revoke",
  requestLock,
  validateRequest({ body: revokeCertificateSchema }),
  revokeCertificateHandler,
);

export default router;