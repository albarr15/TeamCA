// backend/src/controllers/certificateController.ts
//
// Handlers split by access level:
//   - Admin handlers (issue/revoke/list) are wired into certificateRoutes.ts,
//     which requires authenticateJWT + Admin/Superadmin.
//   - Public handlers (verify/qr) are wired into
//     certificateVerificationRoutes.ts, which has NO auth middleware at
//     all. Never add anything to the public handlers' responses beyond
//     what certificateService.verifyCertificate already returns — that
//     function is the one place enforcing what's safe to expose publicly.

import type { Request, Response } from "express";
import {
  issueCertificate,
  revokeCertificate,
  listCertificates,
  listCertificateLogs,
  listCertificateEligibleInterns,
  verifyCertificate,
  generateCertificateQrPng,
} from "../services/certificateService.js";

// ── Admin ──────────────────────────────────────────────────────────────────

export const issueCertificateHandler = async (req: Request, res: Response) => {
  try {
    const certificate = await issueCertificate(req.user!, req.body.user_id);
    res.status(201).json(certificate);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Failed to issue certificate." });
  }
};

export const revokeCertificateHandler = async (req: Request, res: Response) => {
  try {
    const certificate = await revokeCertificate(
      req.user!,
      req.params.certificateId,
      req.body.reason,
    );
    res.json(certificate);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Failed to revoke certificate." });
  }
};

export const listCertificatesHandler = async (_req: Request, res: Response) => {
  try {
    const certificates = await listCertificates();
    res.json(certificates);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Failed to list certificates." });
  }
};

export const listCertificateEligibleInternsHandler = async (_req: Request, res: Response) => {
  try {
    const interns = await listCertificateEligibleInterns();
    res.json(interns);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Failed to list eligible interns." });
  }
};

export const listCertificateLogsHandler = async (_req: Request, res: Response) => {
  try {
    const logs = await listCertificateLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Failed to list certificate logs." });
  }
};

// ── Public (no auth) ────────────────────────────────────────────────────────

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