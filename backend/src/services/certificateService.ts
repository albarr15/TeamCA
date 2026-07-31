// backend/src/services/certificateService.ts
//
// NEW DEPENDENCY REQUIRED: this file uses the `qrcode` package, which is
// not yet installed in this project (confirmed against package.json).
// Run, from the backend folder:
//   npm install qrcode
//   npm install --save-dev @types/qrcode
// (confirmed OK to add per team decision)

import { Types } from "mongoose";
import crypto from "crypto";
import QRCode from "qrcode";
import User from "../models/User.js";
import Batch from "../models/Batch.js";
import Department from "../models/Department.js";
import BatchAssignment from "../models/BatchAssignment.js";
import Certificate, { type ICertificate } from "../models/Certificate.js";
import CertificateIssuanceLog from "../models/CertificateIssuanceLog.js";

type Actor = Express.AuthUser;

const toObjectId = (id: string) => new Types.ObjectId(id);

// Excludes visually ambiguous characters (0/O, 1/I/L) since this code may
// be manually typed in by someone reading it off a printed certificate.
const CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 10;

export const generateVerificationCode = (): string => {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARSET[bytes[i] % CODE_CHARSET.length];
  }
  // Hyphenated for readability, e.g. ABCDE-FGHJK
  return `${code.slice(0, 5)}-${code.slice(5, 10)}`;
};

const resolveInternDepartment = async (userId: string) => {
  const user = await User.findById(userId).select("departments first_name last_name email").lean();
  if (!user) throw new Error("Intern not found.");
  const internDept = user.departments?.find((d) => d.department_role === "Intern");
  if (!internDept) throw new Error("No intern-role department found for this user.");
  const name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email;
  return { departmentId: internDept.department_id as Types.ObjectId, internName: name };
};

// Matches offboardingApprovalService's resolveActorName pattern: looks the
// actor up by id rather than assuming Express.AuthUser carries a display
// name, since I haven't confirmed that type includes first_name/last_name.
const resolveActorName = async (userId: string): Promise<string> => {
  const user = await User.findById(userId).select("first_name last_name email").lean();
  if (!user) return "Unknown user";
  const name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return name || user.email || "Unknown user";
};

// ── Issuance ─────────────────────────────────────────────────────────────

export const issueCertificate = async (
  actor: Actor,
  userId: string,
): Promise<ICertificate> => {
  // Gate: only interns whose offboarding has actually been approved
  // (BatchAssignment flipped to "Completed" by approveOffboarding) are
  // eligible — issuance is a manual step that happens strictly after
  // approval, not a substitute for it.
  const assignment = await BatchAssignment.findOne({ user_id: toObjectId(userId) })
    .sort({ status_updated_at: -1 })
    .lean();
  if (!assignment || assignment.status !== "Completed") {
    throw new Error(
      "A certificate can only be issued after this intern's offboarding has been approved.",
    );
  }

  const existing = await Certificate.findOne({
    user_id: toObjectId(userId),
    batch_id: assignment.batch_id,
  }).lean();
  if (existing) {
    throw new Error(
      "A certificate already exists for this intern and batch. Revoke it first if it needs to be reissued.",
    );
  }

  const [{ departmentId, internName }, batch] = await Promise.all([
    resolveInternDepartment(userId),
    Batch.findById(assignment.batch_id).select("name").lean(),
  ]);
  const department = await Department.findById(departmentId).select("department_name").lean();
  if (!batch) throw new Error("Batch not found.");
  if (!department) throw new Error("Department not found.");

  // Retry on the astronomically unlikely chance of a code collision.
  let verificationCode = generateVerificationCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const collision = await Certificate.exists({ verification_code: verificationCode });
    if (!collision) break;
    verificationCode = generateVerificationCode();
  }

  const actorName = await resolveActorName(String(actor.user_id));

  const certificate = await Certificate.create({
    user_id: toObjectId(userId),
    batch_id: assignment.batch_id,
    department_id: departmentId,
    intern_name: internName,
    department_name: department.department_name,
    batch_name: batch.name,
    completion_date: assignment.status_updated_at ?? new Date(),
    verification_code: verificationCode,
    status: "active",
    issued_at: new Date(),
    issued_by: toObjectId(String(actor.user_id)),
    issued_by_name: actorName,
  });

  await CertificateIssuanceLog.create({
    certificate_id: certificate._id,
    verification_code: certificate.verification_code,
    user_id: certificate.user_id,
    action: "issued",
    actor_id: toObjectId(String(actor.user_id)),
    actor_name: actorName,
    timestamp: new Date(),
  });

  return certificate.toObject();
};

export const revokeCertificate = async (
  actor: Actor,
  certificateId: string,
  reason?: string,
): Promise<ICertificate> => {
  const certificate = await Certificate.findById(certificateId);
  if (!certificate) throw new Error("Certificate not found.");
  if (certificate.status === "revoked") throw new Error("Certificate is already revoked.");

  const actorName = await resolveActorName(String(actor.user_id));

  certificate.status = "revoked";
  certificate.revoked_at = new Date();
  certificate.revoked_by = toObjectId(String(actor.user_id));
  certificate.revoked_reason = reason;
  await certificate.save();

  await CertificateIssuanceLog.create({
    certificate_id: certificate._id,
    verification_code: certificate.verification_code,
    user_id: certificate.user_id,
    action: "revoked",
    actor_id: toObjectId(String(actor.user_id)),
    actor_name: actorName,
    notes: reason,
    timestamp: new Date(),
  });

  return certificate.toObject();
};

export const listCertificates = async () => {
  return Certificate.find().sort({ issued_at: -1 }).lean();
};

// Interns whose offboarding is completed (BatchAssignment.status ===
// "Completed") but who don't yet have a certificate for that specific
// batch. This is what powers the "Ready for Certificate Issuance" list in
// OffboardingApprovalPanel.tsx — approved interns disappear from the
// existing candidates list the moment they're approved, so admins need a
// separate place to see who's still waiting on a certificate.
export const listCertificateEligibleInterns = async () => {
  const completedAssignments = await BatchAssignment.find({ status: "Completed" })
    .select("user_id batch_id status_updated_at")
    .lean();

  const existingCerts = await Certificate.find({}).select("user_id batch_id").lean();
  const certKey = (userId: string, batchId: string) => `${userId}_${batchId}`;
  const certifiedPairs = new Set(
    existingCerts.map((c) => certKey(String(c.user_id), String(c.batch_id))),
  );

  const eligible = completedAssignments.filter(
    (a) => !certifiedPairs.has(certKey(String(a.user_id), String(a.batch_id))),
  );
  if (eligible.length === 0) return [];

  const userIds = eligible.map((a) => a.user_id);
  const batchIds = eligible.map((a) => a.batch_id);

  const [users, batches] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select("first_name last_name email").lean(),
    Batch.find({ _id: { $in: batchIds } }).select("name").lean(),
  ]);
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const batchMap = new Map(batches.map((b) => [String(b._id), b]));

  return eligible.map((a) => {
    const user = userMap.get(String(a.user_id));
    const batch = batchMap.get(String(a.batch_id));
    const name = user
      ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email
      : "Unknown";
    return {
      user_id: String(a.user_id),
      name,
      email: user?.email ?? "",
      batch_id: String(a.batch_id),
      batch_name: batch?.name ?? "Unknown",
      completed_at: a.status_updated_at ?? null,
    };
  });
};

export const listCertificateLogs = async () => {
  return CertificateIssuanceLog.find().sort({ timestamp: -1 }).lean();
};

// ── Public verification ───────────────────────────────────────────────────
// CRITICAL: this response is served with no authentication at all (see
// certificateVerificationRoutes.ts). It must never return anything beyond
// what a printed certificate itself would show — no email, no internal
// user_id, no department_id/batch_id. Only the fields below.

export type PublicVerificationResult =
  | {
      status: "valid";
      verification_code: string;
      intern_name: string;
      department_name: string;
      batch_name: string;
      completion_date: Date;
      issued_at: Date;
    }
  | { status: "revoked"; verification_code: string }
  | { status: "not_found"; verification_code: string };

export const verifyCertificate = async (code: string): Promise<PublicVerificationResult> => {
  const certificate = await Certificate.findOne({ verification_code: code }).lean();
  if (!certificate) return { status: "not_found", verification_code: code };
  if (certificate.status === "revoked") {
    return { status: "revoked", verification_code: code };
  }
  return {
    status: "valid",
    verification_code: certificate.verification_code,
    intern_name: certificate.intern_name,
    department_name: certificate.department_name,
    batch_name: certificate.batch_name,
    completion_date: certificate.completion_date,
    issued_at: certificate.issued_at,
  };
};

// ── QR generation ─────────────────────────────────────────────────────────
// Reuses the same FRONTEND_URL env var already configured for CORS in
// index.ts, rather than introducing a second, redundant variable.
const getFrontendBaseUrl = () => process.env.FRONTEND_URL ?? "http://localhost:4321";

export const buildVerificationUrl = (code: string) =>
  `${getFrontendBaseUrl()}/verify/${encodeURIComponent(code)}`;

export const generateCertificateQrPng = async (code: string): Promise<Buffer> => {
  const url = buildVerificationUrl(code);
  return QRCode.toBuffer(url, { type: "png", width: 320, margin: 2 });
};