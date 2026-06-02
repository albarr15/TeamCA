import mongoose, { Document, Schema, Types } from "mongoose";

export type BatchMemberStatus = "Active" | "Completed" | "Withdrawn";

export interface IBatchAssignment extends Document {
  batch_id: Types.ObjectId;
  user_id: Types.ObjectId;
  assigned_at: Date;
  status: BatchMemberStatus;
  status_updated_at?: Date;
  notes?: string;
}

const batchAssignmentSchema = new Schema<IBatchAssignment>({
  batch_id: {
    type: Schema.Types.ObjectId,
    ref: "Batch",
    required: true,
    index: true,
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  assigned_at: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["Active", "Completed", "Withdrawn"],
    default: "Active",
  },
  status_updated_at: { type: Date },
  notes: { type: String, maxlength: 2000 },
});

batchAssignmentSchema.index({ batch_id: 1, user_id: 1 }, { unique: true });

export default mongoose.model<IBatchAssignment>(
  "BatchAssignment",
  batchAssignmentSchema,
);
