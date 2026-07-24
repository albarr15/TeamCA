// file: backend/src/models/ExtensionRequest.ts
// Internship Extension Request — lets an intern (or their Head/Supervisor on
// their behalf) request additional required hours / a later expected end
// date. Approval bumps the intern's InternProfile.required_hours, which in
// turn pushes out the derived expected_completion_date shown on their profile.

import mongoose, { Document, Schema, Types } from "mongoose";

export type ExtensionRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type ExtensionHistoryAction =
  | "submitted"
  | "approved"
  | "rejected"
  | "cancelled";

export interface IExtensionHistoryEntry {
  action: ExtensionHistoryAction;
  actor_id: Types.ObjectId;
  actor_name: string;
  remarks?: string;
  timestamp: Date;
}

export interface IExtensionRequest extends Document {
  // The intern whose internship is being extended.
  intern_id: Types.ObjectId;
  // Who filed the request — the intern themselves, or a Head/Supervisor/Admin
  // acting on their behalf.
  requested_by: Types.ObjectId;
  department_id?: Types.ObjectId;

  additional_hours: number;
  previous_required_hours: number;
  new_required_hours: number;

  reason: string;

  status: ExtensionRequestStatus;

  reviewed_by?: Types.ObjectId;
  reviewed_at?: Date;
  rejection_reason?: string;

  // Full audit trail of every action taken on this request.
  history: IExtensionHistoryEntry[];

  createdAt: Date;
  updatedAt: Date;
}

const extensionHistorySchema = new Schema<IExtensionHistoryEntry>(
  {
    action: {
      type: String,
      enum: ["submitted", "approved", "rejected", "cancelled"],
      required: true,
    },
    actor_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actor_name: { type: String, required: true },
    remarks: { type: String, trim: true, maxlength: 500 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const extensionRequestSchema = new Schema<IExtensionRequest>(
  {
    intern_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    requested_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    department_id: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      index: true,
    },

    additional_hours: { type: Number, required: true, min: 1 },
    previous_required_hours: { type: Number, required: true, min: 0 },
    new_required_hours: { type: Number, required: true, min: 0 },

    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },

    reviewed_by: { type: Schema.Types.ObjectId, ref: "User" },
    reviewed_at: { type: Date },
    rejection_reason: { type: String, trim: true, maxlength: 500 },

    history: { type: [extensionHistorySchema], default: [] },
  },
  { timestamps: true },
);

// Common query patterns: an intern's own history, and a department's pending queue.
extensionRequestSchema.index({ intern_id: 1, status: 1, createdAt: -1 });
extensionRequestSchema.index({ department_id: 1, status: 1, createdAt: -1 });

export default mongoose.model<IExtensionRequest>(
  "ExtensionRequest",
  extensionRequestSchema,
);