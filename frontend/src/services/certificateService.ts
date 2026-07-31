// frontend/src/services/certificateService.ts
//
// Thin API client for backend/src/routes/certificateRoutes.ts (admin,
// authenticated) and backend/src/routes/certificateVerificationRoutes.ts
// (public, no auth). Both are mounted under /api via
// backend/src/routes/index.ts, so BASE paths here have no leading /api —
// the shared `api` axios instance (./api) already prefixes every call with
// the backend origin + /api.

import api from "./api";
import type {
  Certificate,
  CertificateEligibleIntern,
  CertificateIssuanceLog,
  PublicVerificationResult,
} from "../types/certificate";

const ADMIN_BASE = "/certificates";
const PUBLIC_BASE = "/verify";

// ── Admin (authenticated) ───────────────────────────────────────────────

export const listCertificates = async (): Promise<Certificate[]> => {
  const res = await api.get(ADMIN_BASE);
  return res.data;
};

export const listEligibleInterns = async (): Promise<CertificateEligibleIntern[]> => {
  const res = await api.get(`${ADMIN_BASE}/eligible-interns`);
  return res.data;
};

export const listCertificateLogs = async (): Promise<CertificateIssuanceLog[]> => {
  const res = await api.get(`${ADMIN_BASE}/logs`);
  return res.data;
};

export const issueCertificate = async (userId: string): Promise<Certificate> => {
  const res = await api.post(`${ADMIN_BASE}/issue`, { user_id: userId });
  return res.data;
};

export const revokeCertificate = async (
  certificateId: string,
  reason?: string,
): Promise<Certificate> => {
  const res = await api.patch(`${ADMIN_BASE}/${certificateId}/revoke`, { reason });
  return res.data;
};

// Builds the QR image URL for a given code. Reuses the same axios
// instance's configured baseURL rather than hardcoding the backend origin,
// so this stays correct if that origin ever changes (e.g. in production).
// Safe to use directly in an <img src> — the QR endpoint is public and
// doesn't need the Authorization header axios would normally attach.
export const getCertificateQrImageUrl = (code: string): string => {
  const base = api.defaults.baseURL ?? "";
  return `${base}${PUBLIC_BASE}/${encodeURIComponent(code)}/qr`;
};

// ── Public (no auth required, but works fine through the same axios
// instance since it simply won't have a token to attach if the visitor
// isn't logged in) ─────────────────────────────────────────────────────

export const verifyCertificate = async (code: string): Promise<PublicVerificationResult> => {
  const res = await api.get(`${PUBLIC_BASE}/${encodeURIComponent(code)}`);
  return res.data;
};