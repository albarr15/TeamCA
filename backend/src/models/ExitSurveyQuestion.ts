import mongoose, { Document, Schema, Types } from "mongoose";

export type ExitSurveyQuestionType = "long_text" | "rating_scale" | "multiple_choice";

export interface IExitSurveyQuestion extends Document {
  question_text: string;
  type: ExitSurveyQuestionType;
  options: string[]; // only meaningful when type === "multiple_choice"
  required: boolean;
  is_active: boolean;
  // Incremented atomically each time a submission answers this question.
  // Locking rule: once > 0, question_text/type/options/required become
  // immutable — only is_active may still change. This avoids a scatter
  // query across ExitSurvey documents every time an admin edits a question,
  // and keeps the lock check a single field read.
  answer_count: number;
  display_order: number;
  createdAt: Date;
  updatedAt: Date;
}

const exitSurveyQuestionSchema = new Schema<IExitSurveyQuestion>(
  {
    question_text: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ["long_text", "rating_scale", "multiple_choice"],
      required: true,
    },
    options: {
      type: [String],
      default: [],
      validate: {
        validator: function (this: IExitSurveyQuestion, value: string[]) {
          // Only multiple_choice questions may carry options, and must have
          // at least two to be a meaningful choice.
          if (this.type === "multiple_choice") return value.length >= 2;
          return value.length === 0;
        },
        message:
          "multiple_choice questions require at least 2 options; other types must not have options.",
      },
    },
    required: {
      type: Boolean,
      default: true,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    answer_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    display_order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

exitSurveyQuestionSchema.index({ is_active: 1, display_order: 1 });

export default mongoose.model<IExitSurveyQuestion>(
  "ExitSurveyQuestion",
  exitSurveyQuestionSchema,
);