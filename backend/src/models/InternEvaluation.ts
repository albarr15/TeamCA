import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInternEvaluation extends Document {
  user_id: Types.ObjectId;
  evaluator_id: Types.ObjectId;
  summary: string;
  strengths: string;
  improvement_areas: string;
  recommendation: string;
  createdAt: Date;
  updatedAt: Date;
}

const internEvaluationSchema = new Schema<IInternEvaluation>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    evaluator_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    summary: { type: String, required: true, trim: true, minlength: 3, maxlength: 4000 },
    strengths: { type: String, required: true, trim: true, minlength: 3, maxlength: 4000 },
    improvement_areas: { type: String, required: true, trim: true, minlength: 3, maxlength: 4000 },
    recommendation: { type: String, required: true, trim: true, minlength: 3, maxlength: 2000 },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model<IInternEvaluation>("InternEvaluation", internEvaluationSchema);
