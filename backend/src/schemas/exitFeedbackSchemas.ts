// ASSUMPTION: written against zod, inferred from the `*Schema` naming
// convention in taskSchemas.ts / extensionSchemas.ts. If this codebase
// actually uses Joi or something else, the shape below translates directly
// but the import and builder syntax will need to change.
import { z } from "zod";
import { FEEDBACK_THEMES } from "../models/exitSurvey.js";

// ── Question management (admin) ─────────────────────────────────────────

export const questionTypeSchema = z.enum(["long_text", "rating_scale", "multiple_choice"]);

export const createExitSurveyQuestionSchema = z
  .object({
    question_text: z.string().trim().min(5).max(500),
    type: questionTypeSchema,
    options: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
    required: z.boolean().default(true),
    display_order: z.number().int().default(0),
  })
  .refine(
    (data) =>
      data.type === "multiple_choice" ? data.options.length >= 2 : data.options.length === 0,
    {
      message:
        "multiple_choice questions require at least 2 options; other types must not have options.",
      path: ["options"],
    },
  );

// Editing is only allowed while answer_count === 0 (enforced in the
// service layer, not here) — is_active is the one field that always
// remains editable regardless of lock state.
export const updateExitSurveyQuestionSchema = z
  .object({
    question_text: z.string().trim().min(5).max(500).optional(),
    type: questionTypeSchema.optional(),
    options: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
    required: z.boolean().optional(),
    display_order: z.number().int().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update." });

// ── Submission ───────────────────────────────────────────────────────────

const customAnswerSchema = z.object({
  question_id: z.string(),
  // Validated more precisely per-question-type in the service layer, since
  // the allowed shape (string vs 1-5 number vs one-of-options) depends on
  // data only the DB has (the question's type/options at submit time).
  answer: z.union([z.string().trim().min(1).max(2000), z.number().int().min(1).max(5)]),
});

export const submitExitSurveySchema = z.object({
  satisfaction_rating: z.number().int().min(1).max(5),
  feedback_themes: z.array(z.enum(FEEDBACK_THEMES)).default([]),
  comments: z.string().trim().max(2000).optional(),
  would_recommend: z.boolean().optional(),
  custom_answers: z.array(customAnswerSchema).default([]),
});

// ── Analytics / export ───────────────────────────────────────────────────

export const exitFeedbackAnalyticsQuerySchema = z.object({
  department_id: z.string().optional(),
  batch_id: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});