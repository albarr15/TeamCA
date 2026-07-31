// backend/src/controllers/certificatePublicController.ts
//
// PUBLIC handlers (verify/qr). Wired into certificateVerificationRoutes.ts,
// which has NO auth middleware at all. Never add anything to these
// handlers' responses beyond what certificateService.verifyCertificate
// already returns — that function is the one place enforcing what's safe
// to expose publicly.
//
// Split out from what was originally a single certificateController.ts —
// see certificateAdminController.ts's header comment for why.

import type { Request, Response } from "express";
import { verifyCertificate, generateCertificateQrPng } from "../services/certificateService.js";

export const verifyCertificateHandler = async (req: Request, res: Response) => {
  try {
    const result = await verifyCertificate(req.params.code);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Failed to verify certificate." });
  }
};

export const getCertificateQrHandler = async (req: Request, res: Response) => {
  try {
    const png = await generateCertificateQrPng(req.params.code);
    res.setHeader("Content-Type", "image/png");
    res.send(png);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Failed to generate QR code." });
  }
};