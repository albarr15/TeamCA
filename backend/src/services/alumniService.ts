import { Types, type ClientSession } from "mongoose";
import User from "../models/User";
import InternProfile from "../models/InternProfile";
import InternEvaluation from "../models/InternEvaluation";
import BatchAssignment from "../models/BatchAssignment";
import Batch from "../models/Batch";

type Actor = Express.AuthUser;

const toObjectId = (id: string) => new Types.ObjectId(id);

const canManageIntern = async (actor: Actor, userId: string) => {
  if (actor.global_role === "Admin" || actor.global_role === "Superadmin") return true;
  if (actor.department_role !== "Head" && actor.department_role !== "Supervisor") return false;

  const target = await User.findById(userId).select("departments").lean();
  return Boolean(
    target && actor.department_id &&
      target.departments?.some((item) => String(item.department_id) === String(actor.department_id)),
  );
};

const normalizeEvaluation = (evaluation: any) => ({
  evaluation_id: String(evaluation._id),
  user_id: String(evaluation.user_id),
  evaluator: evaluation.evaluator_id
    ? {
        user_id: String(evaluation.evaluator_id._id),
        first_name: evaluation.evaluator_id.first_name,
        last_name: evaluation.evaluator_id.last_name,
        email: evaluation.evaluator_id.email,
      }
    : null,
  summary: evaluation.summary,
  strengths: evaluation.strengths,
  improvement_areas: evaluation.improvement_areas,
  recommendation: evaluation.recommendation,
  created_at: evaluation.createdAt,
  updated_at: evaluation.updatedAt,
});

const getAssignment = (userId: string) =>
  BatchAssignment.findOne({ user_id: toObjectId(userId) }).populate(
    "batch_id",
    "name start_date end_date description",
  );

const normalizeProfile = (profile: any, user: any, assignment: any, evaluations: any[]) => ({
  user: {
    user_id: String(user._id),
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    is_active: user.is_active,
    departments: user.departments,
  },
  internship: {
    profile_id: String(profile._id),
    school_university: profile.school_university,
    required_hours: profile.required_hours,
    completed_hours: profile.rendered_hours_total ?? 0,
    days_worked: profile.days_worked ?? 0,
    actual_end_date: profile.actual_end_date,
    archived_at: profile.archived_at,
    archived_by: profile.archived_by ? String(profile.archived_by) : null,
    archive_override_reason: profile.archive_override_reason ?? null,
  },
  batch: assignment?.batch_id
    ? {
        batch_id: String(assignment.batch_id._id),
        name: assignment.batch_id.name,
        start_date: assignment.batch_id.start_date,
        end_date: assignment.batch_id.end_date,
        status: assignment.status,
        notes: assignment.notes ?? null,
      }
    : null,
  evaluations: evaluations.map(normalizeEvaluation),
});

const getProfileForReview = async (userId: string) => {
  const profile = await InternProfile.findOne({ user_id: toObjectId(userId) }).lean();
  if (!profile) throw new Error("Intern profile not found.");
  const user = await User.findById(userId).select("first_name last_name email is_active departments").lean();
  if (!user) throw new Error("User not found.");
  const [assignment, evaluations] = await Promise.all([
    getAssignment(userId),
    InternEvaluation.find({ user_id: toObjectId(userId) })
      .sort({ createdAt: -1 })
      .populate("evaluator_id", "first_name last_name email")
      .lean(),
  ]);
  return normalizeProfile(profile, user, assignment, evaluations);
};

export type EvaluationInput = {
  summary: string;
  strengths: string;
  improvement_areas: string;
  recommendation: string;
};

export const listAlumni = async (query = "") => {
  const trimmed = query.trim();
  let userIds: Types.ObjectId[] | undefined;

  if (trimmed) {
    const expression = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const users = await User.find({
      $or: [
        { first_name: expression },
        { last_name: expression },
        { email: expression },
      ],
    }).select("_id").lean();
    userIds = users.map((user) => user._id);
  }

  const profileQuery: Record<string, unknown> = { is_archived: true };
  if (userIds) {
    profileQuery.$or = [
      { user_id: { $in: userIds } },
      { school_university: new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
    ];
  }

  const profiles = await InternProfile.find(profileQuery)
    .sort({ archived_at: -1 })
    .populate("user_id", "first_name last_name email is_active departments")
    .lean();

  return Promise.all(
    profiles.map(async (profile: any) => {
      const user = profile.user_id;
      const assignment = await getAssignment(String(user._id));
      return {
        user_id: String(user._id),
        name: `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email,
        email: user.email,
        school_university: profile.school_university,
        completed_hours: profile.rendered_hours_total ?? 0,
        required_hours: profile.required_hours,
        archived_at: profile.archived_at,
        batch: assignment?.batch_id && typeof assignment.batch_id === "object"
          ? { batch_id: String((assignment.batch_id as any)._id), name: (assignment.batch_id as any).name }
          : null,
      };
    }),
  );
};

export const getAlumniProfile = async (userId: string) => {
  const profile = await InternProfile.findOne({ user_id: toObjectId(userId), is_archived: true }).lean();
  if (!profile) throw new Error("Alumni profile not found.");
  const user = await User.findById(userId).select("first_name last_name email is_active departments").lean();
  if (!user) throw new Error("User not found.");
  const [assignment, evaluations] = await Promise.all([
    getAssignment(userId),
    InternEvaluation.find({ user_id: toObjectId(userId) })
      .sort({ createdAt: -1 })
      .populate("evaluator_id", "first_name last_name email")
      .lean(),
  ]);
  return normalizeProfile(profile, user, assignment, evaluations);
};

export const getArchiveCandidate = async (actor: Actor, userId: string) => {
  if (!(await canManageIntern(actor, userId))) throw new Error("Insufficient permissions to view this intern.");
  const profile = await InternProfile.findOne({ user_id: toObjectId(userId), is_archived: { $ne: true } }).lean();
  if (!profile) throw new Error("Archive candidate not found.");
  return getProfileForReview(userId);
};

export const listArchiveCandidates = async (actor: Actor, query = "") => {
  if (!(actor.global_role === "Admin" || actor.global_role === "Superadmin" || actor.department_role === "Head" || actor.department_role === "Supervisor")) {
    throw new Error("Insufficient permissions to view archive candidates.");
  }
  const expression = query.trim()
    ? new RegExp(query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    : null;
  const eligibleBatches = await Batch.find({
    start_date: { $lte: new Date() },
    is_archived: { $ne: true },
  }).select("_id").lean();
  const activeAssignments = await BatchAssignment.find({
    status: "Active",
    batch_id: { $in: eligibleBatches.map((batch) => batch._id) },
  }).select("user_id").lean();
  const users = await User.find({
    _id: { $in: activeAssignments.map((assignment) => assignment.user_id) },
    is_active: true,
    ...(expression ? { $or: [{ first_name: expression }, { last_name: expression }, { email: expression }] } : {}),
    departments: { $elemMatch: { department_role: "Intern" } },
  }).select("first_name last_name email departments").lean();
  const profiles = await InternProfile.find({
    is_archived: { $ne: true },
    user_id: { $in: users.map((user) => user._id) },
  }).lean();
  const profileMap = new Map(profiles.map((profile) => [String(profile.user_id), profile]));
  const candidates = await Promise.all(users.map(async (user) => {
    const profile = profileMap.get(String(user._id));
    if (!profile) return null;
    if (actor.department_role === "Head" || actor.department_role === "Supervisor") {
      const sameDepartment = user.departments?.some((item) => String(item.department_id) === String(actor.department_id));
      if (!sameDepartment) return null;
    }
    const assignment = await getAssignment(String(user._id));
    return {
      user_id: String(user._id),
      name: `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email,
      email: user.email,
      school_university: profile.school_university,
      completed_hours: profile.rendered_hours_total ?? 0,
      required_hours: profile.required_hours,
      assignment_status: assignment?.status ?? null,
      evaluation_count: await InternEvaluation.countDocuments({ user_id: user._id }),
    };
  }));
  return candidates.filter(Boolean);
};

export const createEvaluation = async (actor: Actor, userId: string, input: EvaluationInput) => {
  if (!(await canManageIntern(actor, userId))) throw new Error("Insufficient permissions to evaluate this intern.");
  const profile = await InternProfile.findOne({ user_id: toObjectId(userId) });
  if (!profile) throw new Error("Intern profile not found.");
  if (profile.is_archived) throw new Error("Archived internship records are read-only.");
  const evaluation = await InternEvaluation.create({ user_id: userId, evaluator_id: actor.user_id, ...input });
  return normalizeEvaluation(await evaluation.populate("evaluator_id", "first_name last_name email"));
};

export const archiveIntern = async (
  actor: Actor,
  userId: string,
  input: { override?: boolean; override_reason?: string },
  options: { session?: ClientSession; skipProfileResponse?: boolean } = {},
) => {
  if (!(await canManageIntern(actor, userId))) throw new Error("Insufficient permissions to archive this intern.");
  const profile = await InternProfile.findOne({ user_id: toObjectId(userId) }).session(options.session ?? null);
  if (!profile) throw new Error("Intern profile not found.");
  if (profile.is_archived) throw new Error("Intern is already archived.");

  const [assignment, evaluationCount] = await Promise.all([
    getAssignment(userId).session(options.session ?? null),
    InternEvaluation.countDocuments({ user_id: toObjectId(userId) }).session(options.session ?? null),
  ]);
  const override = Boolean(input.override);
  const canOverride = actor.global_role === "Admin" || actor.global_role === "Superadmin";
  if (evaluationCount === 0 && (!override || !canOverride)) {
    throw new Error("At least one evaluation is required before archiving.");
  }

  const hasCompletedStatus = assignment?.status === "Completed";
  const hasCompletedHours = (profile.rendered_hours_total ?? 0) >= profile.required_hours;
  const complete = hasCompletedStatus && hasCompletedHours;
  if (!complete && (!override || !canOverride)) {
    throw new Error("Intern must have completed status and required hours, or an admin override.");
  }

  profile.is_archived = true;
  profile.archived_at = new Date();
  profile.archived_by = toObjectId(String(actor.user_id));
  profile.archive_override_reason = complete ? undefined : input.override_reason?.trim();
  await profile.save({ session: options.session });
  if (options.skipProfileResponse) return null;
  return getAlumniProfile(userId);
};
