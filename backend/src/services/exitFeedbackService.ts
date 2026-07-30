import { Types } from "mongoose";
import User from "../models/User.js";
import BatchAssignment from "../models/BatchAssignment.js";
import ExitSurvey, {
  FEEDBACK_THEMES,
  type FeedbackTheme,
  type ExitSurveyCustomAnswer,
} from "../models/ExitSurvey.js";
import ExitSurveyQuestion, {
  type ExitSurveyQuestionType,
} from "../models/ExitSurveyQuestion.js";
import { getReadiness, type OffboardingReadiness } from "./offboardingApprovalService.js";

type Actor = Express.AuthUser;

const toObjectId = (id: string) => new Types.ObjectId(id);

// ── Eligibility ───────────────────────────────────────────────────────────
// Gates on offboardingApprovalService.getReadiness() — the same strict,
// all-or-nothing check used to approve formal offboarding (hours, tasks,
// deliverables, evaluation, no pending extension). Deliberately NOT using
// readinessScoreService's weighted 100% score: that's a display/progress
// metric that omits evaluation_complete and no_pending_extension, so it can
// read 100% while this authoritative gate still blocks the intern.
export const getExitSurveyReadiness = async (userId: string): Promise<OffboardingReadiness> =>
  getReadiness(userId);

export const isEligibleForExitSurvey = async (userId: string): Promise<boolean> => {
  try {
    const readiness = await getReadiness(userId);
    return readiness.blockers.length === 0;
  } catch {
    return false;
  }
};

const resolveInternDepartmentId = async (userId: string): Promise<Types.ObjectId> => {
  const user = await User.findById(userId).select("departments").lean();
  const internDept = user?.departments?.find((d) => d.department_role === "Intern");
  if (!internDept) {
    throw new Error("No intern-role department found for this user.");
  }
  return internDept.department_id as Types.ObjectId;
};

const resolveCurrentBatchId = async (userId: string): Promise<Types.ObjectId> => {
  const assignment = await BatchAssignment.findOne({ user_id: toObjectId(userId) })
    .sort({ assigned_at: -1 })
    .select("batch_id")
    .lean();
  if (!assignment) {
    throw new Error("No batch assignment found for this user.");
  }
  return assignment.batch_id as Types.ObjectId;
};

// ── Question management (admin) ─────────────────────────────────────────
// "Multiple choice" is single-select (one option per response), matching
// the same frequency-count pattern already used for feedback_themes.

export type CreateQuestionInput = {
  question_text: string;
  type: ExitSurveyQuestionType;
  options: string[];
  required: boolean;
  display_order: number;
};

export const createExitSurveyQuestion = async (input: CreateQuestionInput) => {
  const question = await ExitSurveyQuestion.create(input);
  return question.toObject();
};

export type UpdateQuestionInput = Partial<CreateQuestionInput> & { is_active?: boolean };

export const updateExitSurveyQuestion = async (
  questionId: string,
  input: UpdateQuestionInput,
) => {
  const question = await ExitSurveyQuestion.findById(questionId);
  if (!question) throw new Error("Question not found.");

  const isLocked = question.answer_count > 0;
  const editingLockedFields =
    input.question_text !== undefined ||
    input.type !== undefined ||
    input.options !== undefined ||
    input.required !== undefined;

  if (isLocked && editingLockedFields) {
    throw new Error(
      "This question already has responses and can no longer be edited. You can still deactivate it.",
    );
  }

  if (!isLocked) {
    if (input.question_text !== undefined) question.question_text = input.question_text;
    if (input.type !== undefined) question.type = input.type;
    if (input.options !== undefined) question.options = input.options;
    if (input.required !== undefined) question.required = input.required;
  }
  if (input.display_order !== undefined) question.display_order = input.display_order;
  if (input.is_active !== undefined) question.is_active = input.is_active;

  // Re-validate the type/options pairing since partial updates could
  // otherwise leave e.g. a multiple_choice question with 0 options.
  if (question.type === "multiple_choice" && question.options.length < 2) {
    throw new Error("multiple_choice questions require at least 2 options.");
  }
  if (question.type !== "multiple_choice" && question.options.length > 0) {
    throw new Error("Only multiple_choice questions may have options.");
  }

  await question.save();
  return question.toObject();
};

export const listExitSurveyQuestions = async (opts: { activeOnly?: boolean } = {}) => {
  const filter = opts.activeOnly ? { is_active: true } : {};
  return ExitSurveyQuestion.find(filter).sort({ display_order: 1, createdAt: 1 }).lean();
};

// ── Submission ───────────────────────────────────────────────────────────

export type CustomAnswerInput = { question_id: string; answer: string | number };

export type ExitSurveySubmission = {
  satisfaction_rating: number;
  feedback_themes: FeedbackTheme[];
  comments?: string;
  would_recommend?: boolean;
  custom_answers: CustomAnswerInput[];
};

const validateAndSnapshotCustomAnswers = async (
  answers: CustomAnswerInput[],
): Promise<{ snapshots: ExitSurveyCustomAnswer[]; questionIdsAnswered: Types.ObjectId[] }> => {
  const activeQuestions = await ExitSurveyQuestion.find({ is_active: true }).lean();
  const questionMap = new Map(activeQuestions.map((q) => [String(q._id), q]));

  const answeredIds = new Set(answers.map((a) => a.question_id));
  const missingRequired = activeQuestions.filter(
    (q) => q.required && !answeredIds.has(String(q._id)),
  );
  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required answer(s) for: ${missingRequired.map((q) => q.question_text).join(", ")}`,
    );
  }

  const snapshots: ExitSurveyCustomAnswer[] = [];
  const questionIdsAnswered: Types.ObjectId[] = [];

  for (const a of answers) {
    const question = questionMap.get(a.question_id);
    if (!question) {
      throw new Error(`Question ${a.question_id} is not active or does not exist.`);
    }

    if (question.type === "long_text") {
      if (typeof a.answer !== "string" || a.answer.trim().length === 0) {
        throw new Error(`"${question.question_text}" requires a text answer.`);
      }
    } else if (question.type === "rating_scale") {
      if (typeof a.answer !== "number" || a.answer < 1 || a.answer > 5) {
        throw new Error(`"${question.question_text}" requires a rating from 1 to 5.`);
      }
    } else if (question.type === "multiple_choice") {
      if (typeof a.answer !== "string" || !question.options.includes(a.answer)) {
        throw new Error(`"${question.question_text}" requires one of the listed options.`);
      }
    }

    snapshots.push({
      question_id: question._id as Types.ObjectId,
      question_text_snapshot: question.question_text,
      question_type_snapshot: question.type,
      answer: a.answer,
    });
    questionIdsAnswered.push(question._id as Types.ObjectId);
  }

  return { snapshots, questionIdsAnswered };
};

export const submitExitSurvey = async (actor: Actor, payload: ExitSurveySubmission) => {
  const userId = String(actor.user_id);

  if (payload.satisfaction_rating < 1 || payload.satisfaction_rating > 5) {
    throw new Error("Satisfaction rating must be between 1 and 5.");
  }
  const invalidThemes = (payload.feedback_themes ?? []).filter(
    (theme) => !FEEDBACK_THEMES.includes(theme),
  );
  if (invalidThemes.length > 0) {
    throw new Error(`Invalid feedback theme(s): ${invalidThemes.join(", ")}`);
  }

  const readiness = await getReadiness(userId).catch(() => null);
  if (!readiness || readiness.blockers.length > 0) {
    const reason = readiness?.blockers.join(" ") ?? "Intern profile not found.";
    throw new Error(`Exit survey is not yet available: ${reason}`);
  }

  const existing = await ExitSurvey.findOne({ user_id: toObjectId(userId) }).lean();
  if (existing) {
    throw new Error("You have already submitted an exit survey for this internship.");
  }

  const [departmentId, batchId, { snapshots, questionIdsAnswered }] = await Promise.all([
    resolveInternDepartmentId(userId),
    resolveCurrentBatchId(userId),
    validateAndSnapshotCustomAnswers(payload.custom_answers ?? []),
  ]);

  const survey = await ExitSurvey.create({
    user_id: toObjectId(userId),
    batch_id: batchId,
    department_id: departmentId,
    satisfaction_rating: payload.satisfaction_rating,
    feedback_themes: payload.feedback_themes ?? [],
    comments: payload.comments,
    would_recommend: payload.would_recommend,
    custom_answers: snapshots,
    submitted_at: new Date(),
  });

  // Lock every answered question by bumping its answer_count. Done after
  // the survey is successfully created so a failed submission never
  // partially locks a question with no corresponding response.
  if (questionIdsAnswered.length > 0) {
    await ExitSurveyQuestion.updateMany(
      { _id: { $in: questionIdsAnswered } },
      { $inc: { answer_count: 1 } },
    );
  }

  return survey.toObject();
};

export const getExitSurveyStatus = async (userId: string) => {
  const [readiness, existing] = await Promise.all([
    getReadiness(userId).catch(() => null),
    ExitSurvey.exists({ user_id: toObjectId(userId) }),
  ]);
  return {
    eligible: Boolean(readiness && readiness.blockers.length === 0),
    blockers: readiness?.blockers ?? [],
    already_submitted: Boolean(existing),
  };
};

// ── Analytics ────────────────────────────────────────────────────────────

export type ExitFeedbackFilter = {
  department_id?: string;
  batch_id?: string;
  from?: Date;
  to?: Date;
};

const buildMatchStage = (filter: ExitFeedbackFilter) => {
  const match: Record<string, unknown> = {};
  if (filter.department_id) match.department_id = toObjectId(filter.department_id);
  if (filter.batch_id) match.batch_id = toObjectId(filter.batch_id);
  if (filter.from || filter.to) {
    match.submitted_at = {
      ...(filter.from ? { $gte: filter.from } : {}),
      ...(filter.to ? { $lte: filter.to } : {}),
    };
  }
  return match;
};

export type CustomQuestionAnalytics = {
  question_id: string;
  question_text: string;
  type: ExitSurveyQuestionType;
  response_count: number;
  // rating_scale only:
  average?: number;
  distribution?: Record<1 | 2 | 3 | 4 | 5, number>;
  // multiple_choice only:
  option_frequency?: { option: string; count: number }[];
  // long_text only:
  responses?: string[];
};

export type ExitFeedbackAnalytics = {
  total_responses: number;
  average_satisfaction: number;
  satisfaction_distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  would_recommend_rate: number | null;
  theme_frequency: { theme: FeedbackTheme; count: number }[];
  by_department: { department_id: string; average_satisfaction: number; count: number }[];
  by_batch: { batch_id: string; average_satisfaction: number; count: number }[];
  custom_questions: CustomQuestionAnalytics[];
};

const getCustomQuestionAnalytics = async (
  match: Record<string, unknown>,
): Promise<CustomQuestionAnalytics[]> => {
  // Every question that currently has at least one answer is worth
  // reporting on, even if it's since been deactivated — deactivating a
  // question shouldn't erase its historical analytics.
  const questions = await ExitSurveyQuestion.find({ answer_count: { $gt: 0 } })
    .sort({ display_order: 1 })
    .lean();

  return Promise.all(
    questions.map(async (q) => {
      const questionMatch = {
        ...match,
        custom_answers: { $elemMatch: { question_id: q._id } },
      };

      if (q.type === "rating_scale") {
        const rows = await ExitSurvey.aggregate([
          { $match: questionMatch },
          { $unwind: "$custom_answers" },
          { $match: { "custom_answers.question_id": q._id } },
          {
            $group: {
              _id: "$custom_answers.answer",
              count: { $sum: 1 },
            },
          },
        ]);
        const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        };
        let total = 0;
        let sum = 0;
        for (const row of rows) {
          const rating = row._id as number;
          if (rating >= 1 && rating <= 5) {
            distribution[rating as 1 | 2 | 3 | 4 | 5] = row.count;
            total += row.count;
            sum += rating * row.count;
          }
        }
        return {
          question_id: String(q._id),
          question_text: q.question_text,
          type: q.type,
          response_count: total,
          average: total > 0 ? Math.round((sum / total) * 100) / 100 : 0,
          distribution,
        };
      }

      if (q.type === "multiple_choice") {
        const rows = await ExitSurvey.aggregate([
          { $match: questionMatch },
          { $unwind: "$custom_answers" },
          { $match: { "custom_answers.question_id": q._id } },
          { $group: { _id: "$custom_answers.answer", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]);
        return {
          question_id: String(q._id),
          question_text: q.question_text,
          type: q.type,
          response_count: rows.reduce((sum, r) => sum + r.count, 0),
          option_frequency: rows.map((r) => ({ option: String(r._id), count: r.count })),
        };
      }

      // long_text — no meaningful numeric aggregation; return the raw
      // responses for a browsable list in the UI.
      const rows = await ExitSurvey.find(questionMatch)
        .select("custom_answers")
        .lean();
      const responses = rows
        .flatMap((r) => r.custom_answers ?? [])
        .filter((a) => String(a.question_id) === String(q._id))
        .map((a) => String(a.answer));

      return {
        question_id: String(q._id),
        question_text: q.question_text,
        type: q.type,
        response_count: responses.length,
        responses,
      };
    }),
  );
};

export const getExitFeedbackAnalytics = async (
  filter: ExitFeedbackFilter = {},
): Promise<ExitFeedbackAnalytics> => {
  const match = buildMatchStage(filter);

  const [summary, distribution, themes, byDepartment, byBatch, customQuestions] =
    await Promise.all([
      ExitSurvey.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total_responses: { $sum: 1 },
            average_satisfaction: { $avg: "$satisfaction_rating" },
            recommend_yes: {
              $sum: { $cond: [{ $eq: ["$would_recommend", true] }, 1, 0] },
            },
            recommend_answered: {
              $sum: { $cond: [{ $ne: ["$would_recommend", null] }, 1, 0] },
            },
          },
        },
      ]),
      ExitSurvey.aggregate([
        { $match: match },
        { $group: { _id: "$satisfaction_rating", count: { $sum: 1 } } },
      ]),
      ExitSurvey.aggregate([
        { $match: match },
        { $unwind: "$feedback_themes" },
        { $group: { _id: "$feedback_themes", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      ExitSurvey.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$department_id",
            average_satisfaction: { $avg: "$satisfaction_rating" },
            count: { $sum: 1 },
          },
        },
      ]),
      ExitSurvey.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$batch_id",
            average_satisfaction: { $avg: "$satisfaction_rating" },
            count: { $sum: 1 },
          },
        },
      ]),
      getCustomQuestionAnalytics(match),
    ]);

  const summaryRow = summary[0] ?? {
    total_responses: 0,
    average_satisfaction: 0,
    recommend_yes: 0,
    recommend_answered: 0,
  };

  const satisfactionDistribution: ExitFeedbackAnalytics["satisfaction_distribution"] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const row of distribution) {
    if (row._id >= 1 && row._id <= 5) {
      satisfactionDistribution[row._id as 1 | 2 | 3 | 4 | 5] = row.count;
    }
  }

  return {
    total_responses: summaryRow.total_responses,
    average_satisfaction: Math.round((summaryRow.average_satisfaction ?? 0) * 100) / 100,
    satisfaction_distribution: satisfactionDistribution,
    would_recommend_rate:
      summaryRow.recommend_answered > 0
        ? Math.round((summaryRow.recommend_yes / summaryRow.recommend_answered) * 10000) / 100
        : null,
    theme_frequency: themes.map((t) => ({ theme: t._id as FeedbackTheme, count: t.count })),
    by_department: byDepartment.map((d) => ({
      department_id: String(d._id),
      average_satisfaction: Math.round((d.average_satisfaction ?? 0) * 100) / 100,
      count: d.count,
    })),
    by_batch: byBatch.map((b) => ({
      batch_id: String(b._id),
      average_satisfaction: Math.round((b.average_satisfaction ?? 0) * 100) / 100,
      count: b.count,
    })),
    custom_questions: customQuestions,
  };
};

// Raw rows for export (PDF/Excel) — one row per response, joined with
// human-readable department/batch names rather than raw ObjectIds. Custom
// answers are flattened into a single "Question: Answer; ..." string so
// each survey stays one row in the spreadsheet regardless of how many
// custom questions exist.
export const getExitFeedbackExportRows = async (filter: ExitFeedbackFilter = {}) => {
  const match = buildMatchStage(filter);

  const rows = await ExitSurvey.find(match)
    .populate("department_id", "department_name")
    .populate("batch_id", "name")
    .populate("user_id", "first_name last_name email")
    .sort({ submitted_at: -1 })
    .lean();

  return rows.map((r: any) => ({
    submitted_at: r.submitted_at,
    intern_name: `${r.user_id?.first_name ?? ""} ${r.user_id?.last_name ?? ""}`.trim() || r.user_id?.email,
    department: r.department_id?.department_name ?? "Unknown",
    batch: r.batch_id?.name ?? "Unknown",
    satisfaction_rating: r.satisfaction_rating,
    would_recommend: r.would_recommend ?? null,
    feedback_themes: r.feedback_themes ?? [],
    comments: r.comments ?? "",
    custom_answers: (r.custom_answers ?? [])
      .map((a: any) => `${a.question_text_snapshot}: ${a.answer}`)
      .join(" | "),
  }));
};