// backend/src/models/CertificateIssuanceLog.ts
//
// Audit trail of every certificate lifecycle event (issued, revoked).
// Kept as its own collection rather than only relying on Certificate's own
// issued_at/revoked_at fields, so there's a durable, append-only history
// even if a Certificate document itself is ever modified or deleted —
// mirrors the reasoning behind ClearanceAction in offboardingApprovalService.ts.

import mongoose, { Document, Schema, Types } from "mongoose";

export type CertificateLogAction = "issued" | "revoked";

export interface ICertificateIssuanceLog extends Document {
  certificate_id: Types.ObjectId;
  verification_code: string; // denormalized for easy log searching without a join
  user_id: Types.ObjectId; // the intern the certificate belongs to
  action: CertificateLogAction;
  actor_id: Types.ObjectId;
  actor_name: string;
  notes?: string;
  timestamp: Date;
}

const certificateIssuanceLogSchema = new Schema<ICertificateIssuanceLog>({
  certificate_id: {
    type: Schema.Types.ObjectId,
    ref: "Certificate",
    required: true,
    index: true,
  },
  verification_code: { type: String, required: true, index: true },
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  action: { type: String, enum: ["issued", "revoked"], required: true },
  actor_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  actor_name: { type: String, required: true },
  notes: { type: String, maxlength: 500 },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<ICertificateIssuanceLog>(
  "CertificateIssuanceLog",
  certificateIssuanceLogSchema,
);