// frontend/src/types/certificate.ts
//
// Mirrors backend/src/models/Certificate.ts,
// backend/src/models/CertificateIssuanceLog.ts, and the response shapes
// from backend/src/services/certificateService.ts.

export type CertificateStatus = "active" | "revoked";

export type Certificate = {
  _id: string;
  user_id: string;
  batch_id: string;
  department_id: string;
  intern_name: string;
  department_name: string;
  batch_name: string;
  completion_date: string;
  verification_code: string;
  status: CertificateStatus;
  issued_at: string;
  issued_by: string;
  issued_by_name: string;
  revoked_at?: string;
  revoked_by?: string;
  revoked_reason?: string;
  createdAt: string;
  updatedAt: string;
};

export type CertificateEligibleIntern = {
  user_id: string;
  name: string;
  email: string;
  batch_id: string;
  batch_name: string;
  completed_at: string | null;
};

export type CertificateLogAction = "issued" | "revoked";

export type CertificateIssuanceLog = {
  _id: string;
  certificate_id: string;
  verification_code: string;
  user_id: string;
  action: CertificateLogAction;
  actor_id: string;
  actor_name: string;
  notes?: string;
  timestamp: string;
};

// Public verification result — matches
// certificateService.PublicVerificationResult exactly. Never add fields
// here beyond what the public endpoint actually returns.
export type PublicVerificationResult =
  | {
      status: "valid";
      verification_code: string;
      intern_name: string;
      department_name: string;
      batch_name: string;
      completion_date: string;
      issued_at: string;
    }
  | { status: "revoked"; verification_code: string }
  | { status: "not_found"; verification_code: string };