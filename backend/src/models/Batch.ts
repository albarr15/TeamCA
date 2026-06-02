import mongoose, { Document, Schema, Types } from "mongoose";

export type BatchStatusOverride = "Active" | "Completed";

export interface IBatch extends Document {
  name: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  supervisor_id?: Types.ObjectId;
  capacity?: number;
  status_override?: BatchStatusOverride | null;
  is_archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const batchSchema = new Schema<IBatch>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    supervisor_id: { type: Schema.Types.ObjectId, ref: "User" },
    capacity: { type: Number, min: 0 },
    status_override: {
      type: String,
      enum: ["Active", "Completed"],
      default: null,
    },
    is_archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

batchSchema.index({ name: 1 }, { unique: true });

export default mongoose.model<IBatch>("Batch", batchSchema);
