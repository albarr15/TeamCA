import mongoose, { Document, Schema, Types } from "mongoose";

export type DeliverablePlatform =
  | "github"
  | "figma"
  | "drive"
  | "vercel"
  | "notion"
  | "other";

export type DeliverableStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "revision_requested";

export interface ITaskWorkLink extends Document {
  task_id: Types.ObjectId;
  submitted_by: Types.ObjectId;
  url: string;
  label?: string;
  platform: DeliverablePlatform;
  status: DeliverableStatus;
  review_notes?: string;
  reviewed_at?: Date;
  reviewed_by?: Types.ObjectId;
  created_at: Date;
}

const taskWorkLinkSchema = new Schema<ITaskWorkLink>({
  task_id: {
    type: Schema.Types.ObjectId,
    ref: "Task",
    required: true,
    index: true,
  },
  submitted_by: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  url: { type: String, required: true, trim: true },
  label: { type: String, trim: true },
  platform: {
    type: String,
    enum: ["github", "figma", "drive", "vercel", "notion", "other"],
    default: "other",
  },
  status: {
    type: String,
    enum: ["pending_review", "approved", "rejected", "revision_requested"],
    default: "pending_review",
  },
  review_notes: { type: String, trim: true },
  reviewed_at:  { type: Date },
  reviewed_by:  { type: Schema.Types.ObjectId, ref: "User" },
  created_at: { type: Date, default: Date.now },
});

taskWorkLinkSchema.index({ task_id: 1, created_at: -1 });

export default mongoose.model<ITaskWorkLink>(
  "TaskWorkLink",
  taskWorkLinkSchema,
);
