// backend/src/models/Certificate.ts
//
// A certificate issued to an intern after their offboarding has been
// formally approved (BatchAssignment.status === "Completed"). Issuance is
// a manual admin action (see certificateService.issueCertificate), not
// automatic — it does not happen as part of approveOffboarding() itself.
//
// Fields are snapshotted at issuance time (intern name, department name,
// batch name, completion date) rather than only storing references, for
// the same reason as ExitSurvey: a certificate must keep reading correctly
// even if the underlying user/department/batch records change or get
// archived later. This also matters more here than for ExitSurvey, since a
// certificate is a formal credential someone may rely on years later.

import mongoose, { Document, Schema, Types } from "mongoose";

export type CertificateStatus = "active" | "revoked";

export interface ICertificate extends Document {
  user_id: Types.ObjectId;
  batch_id: Types.ObjectId;
  department_id: Types.ObjectId;

  // Snapshots — deliberately duplicated off the referenced documents so a
  // certificate's displayed content never silently changes after issuance.
  intern_name: string;
  department_name: string;
  batch_name: string;
  completion_date: Date; // BatchAssignment.status_updated_at at approval time

  // Unique, unguessable code that both the QR and the public verification
  // page key off. See certificateService.generateVerificationCode for the
  // charset (excludes visually ambiguous characters like 0/O, 1/I).
  verification_code: string;

  status: CertificateStatus;
  issued_at: Date;
  issued_by: Types.ObjectId; // admin/superadmin who issued it
  issued_by_name: string;

  revoked_at?: Date;
  revoked_by?: Types.ObjectId;
  revoked_reason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<ICertificate>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    batch_id: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    department_id: { type: Schema.Types.ObjectId, ref: "Department", required: true },

    intern_name: { type: String, required: true },
    department_name: { type: String, required: true },
    batch_name: { type: String, required: true },
    completion_date: { type: Date, required: true },

    verification_code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
      index: true,
    },
    issued_at: { type: Date, default: Date.now },
    issued_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    issued_by_name: { type: String, required: true },

    revoked_at: { type: Date },
    revoked_by: { type: Schema.Types.ObjectId, ref: "User" },
    revoked_reason: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

// One certificate per intern per batch — mirrors the ExitSurvey pattern.
// Re-issuing for the same batch should go through revoke, not a duplicate.
certificateSchema.index({ user_id: 1, batch_id: 1 }, { unique: true });

export default mongoose.model<ICertificate>("Certificate", certificateSchema);