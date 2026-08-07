import mongoose, { Document, Schema, Types } from "mongoose";

export const FEEDBACK_THEMES = [
  "Mentorship",
  "Workload",
  "Communication",
  "Learning Opportunities",
  "Work Environment",
  "Tools & Resources",
  "Task Clarity",
  "Career Growth",
] as const;

export type FeedbackTheme = (typeof FEEDBACK_THEMES)[number];

export type ExitSurveyCustomAnswer = {
  question_id: Types.ObjectId;
  // Snapshotted at submission time so later edits to a question (before it's
  // locked by having any answers) never retroactively change how a past
  // response reads.
  question_text_snapshot: string;
  question_type_snapshot: "long_text" | "rating_scale" | "multiple_choice";
  // long_text -> string, rating_scale -> number (1-5), multiple_choice -> string (one option)
  answer: string | number;
};

export interface IExitSurvey extends Document {
  user_id: Types.ObjectId; // submitter (intern)
  batch_id: Types.ObjectId; // snapshot: batch they are exiting from
  department_id: Types.ObjectId; // snapshot: intern-role department at submission time
  satisfaction_rating: number; // 1-5
  feedback_themes: FeedbackTheme[];
  comments?: string;
  would_recommend?: boolean;
  custom_answers: ExitSurveyCustomAnswer[];
  submitted_at: Date;
  createdAt: Date;
  updatedAt: Date;
}

const exitSurveyCustomAnswerSchema = new Schema<ExitSurveyCustomAnswer>(
  {
    question_id: {
      type: Schema.Types.ObjectId,
      ref: "ExitSurveyQuestion",
      required: true,
    },
    question_text_snapshot: { type: String, required: true },
    question_type_snapshot: {
      type: String,
      enum: ["long_text", "rating_scale", "multiple_choice"],
      required: true,
    },
    answer: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const exitSurveySchema = new Schema<IExitSurvey>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    batch_id: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    department_id: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    satisfaction_rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedback_themes: {
      type: [String],
      enum: FEEDBACK_THEMES,
      default: [],
    },
    comments: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    would_recommend: {
      type: Boolean,
    },
    custom_answers: {
      type: [exitSurveyCustomAnswerSchema],
      default: [],
    },
    submitted_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// One exit survey per intern per batch (re-interning is possible via a new batch).
exitSurveySchema.index({ user_id: 1, batch_id: 1 }, { unique: true });

export default mongoose.model<IExitSurvey>("ExitSurvey", exitSurveySchema);