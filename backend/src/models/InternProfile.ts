import { Schema, model, type InferSchemaType } from "mongoose";

const internProfileSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    school_university: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    required_hours: {
      type: Number,
      required: true,
      min: 1,
    },
    rendered_hours_total: {
      type: Number,
      default: 0,
      min: 0,
    },
    days_worked: {
      type: Number,
      default: 0,
      min: 0,
    },
    actual_end_date: {
      type: Date,
      default: null,
    },
    is_archived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archived_at: {
      type: Date,
      default: null,
    },
    archived_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    archive_override_reason: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type InternProfileDocument = InferSchemaType<typeof internProfileSchema>;

export const InternProfile = model<InternProfileDocument>(
  "InternProfile",
  internProfileSchema,
);

export default InternProfile;
