// file: backend/src/models/ClearanceAction.ts
// Records terminal clearance decisions made on an intern's offboarding
// (i.e. the final approve/reject call on the exit clearance itself).
//
// This is intentionally a small, append-only log — it is combined with the
// existing Google Drive deliverable review history (TaskWorkLink) and
// Extension Request history at query time to build the full, unified
// "Clearance Approval Timeline" (see offboardingApprovalService.getClearanceTimeline).

import mongoose, { Document, Schema, Types } from "mongoose";

export type ClearanceActionType = "approved" | "rejected";

export interface IClearanceAction extends Document {
  intern_id: Types.ObjectId;
  actor_id: Types.ObjectId;
  actor_name: string;
  action: ClearanceActionType;
  notes?: string;
  timestamp: Date;
}

const clearanceActionSchema = new Schema<IClearanceAction>({
  intern_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  actor_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  actor_name: { type: String, required: true, trim: true },
  action: {
    type: String,
    enum: ["approved", "rejected"],
    required: true,
  },
  notes: { type: String, trim: true, maxlength: 1000 },
  timestamp: { type: Date, default: Date.now },
});

clearanceActionSchema.index({ intern_id: 1, timestamp: -1 });

export default mongoose.model<IClearanceAction>(
  "ClearanceAction",
  clearanceActionSchema,
);