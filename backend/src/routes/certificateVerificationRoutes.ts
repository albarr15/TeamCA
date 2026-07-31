// backend/src/routes/certificateVerificationRoutes.ts
//
// PUBLIC ROUTES — deliberately no authenticateJWT anywhere in this file.
// This is what makes "public verification page for employers/schools"
// actually public: anyone with a certificate's code (typed in, or scanned
// off a QR) can look it up without logging in.
//
// Do not add authenticateJWT to this router. If you need an authenticated
// certificate endpoint, add it to certificateRoutes.ts instead.
//
// Mount inside backend/src/routes/index.ts (same aggregator as
// certificateRoutes.ts):
//   import certificateVerificationRoutes from "./certificateVerificationRoutes.js";
//   router.use("/verify", certificateVerificationRoutes);
// This makes every route below reachable at /api/verify/...
// It IS still subject to the global _apiLimiter rate limiter applied to
// all of /api in index.ts — that's just rate limiting, not auth, so the
// endpoint stays genuinely public.

import { Router } from "express";
import { verifyCertificateHandler, getCertificateQrHandler } from "../controllers/certificatePublicController.js";

const router = Router();

// GET /verify/:code
// Public lookup. Returns { status: "valid" | "revoked" | "not_found", ... }.
// Only ever returns the minimal safe fields defined in
// certificateService.verifyCertificate — never email, user_id, or other
// internal identifiers.
router.get("/:code", verifyCertificateHandler);

// GET /verify/:code/qr
// Returns a PNG image (image/png) of a QR code encoding this certificate's
// public verification URL. Used by the admin UI to display/print/download
// the QR for a given certificate.
router.get("/:code/qr", getCertificateQrHandler);

export default router;