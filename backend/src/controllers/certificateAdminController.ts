// backend/src/controllers/certificateAdminController.ts
//
// Admin-only handlers (issue/revoke/list/eligible-interns/logs). Wired
// into certificateRoutes.ts, which requires authenticateJWT +
// Admin/Superadmin.
//
// Split out from what was originally a single certificateController.ts
// shared with the public verify/qr handlers — certificateRoutes.ts and
// certificateVerificationRoutes.ts were both importing from that one file,
// which triggered a circular-import TDZ error at boot
// ("Cannot access 'verifyCertificateHandler' before initialization").
// Splitting into two independent controller files removes the shared
// module entirely, so neither router's import timing can affect the
// other's.

import type { Request, Response } from "express";
import {
  issueCertificate,
  revokeCertificate,
  listCertificates,
  listCertificateLogs,
  listCertificateEligibleInterns,
} from "../services/certificateService.js";

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