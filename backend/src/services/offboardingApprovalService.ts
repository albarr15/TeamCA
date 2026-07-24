import mongoose, { Types } from "mongoose";
import User from "../models/User.js";
import InternProfile from "../models/InternProfile.js";
import InternEvaluation from "../models/InternEvaluation.js";
import BatchAssignment from "../models/BatchAssignment.js";
import ExtensionRequest from "../models/ExtensionRequest.js";
import Task from "../models/Task.js";
import TaskAssignment from "../models/TaskAssignment.js";
import TaskWorkLink from "../models/TaskWorkLink.js";
import Batch from "../models/Batch.js";
import { archiveIntern, getAlumniProfile } from "./alumniService.js";

type Actor = Express.AuthUser;

const toObjectId = (id: string) => new Types.ObjectId(id);

const canManageIntern = async (actor: Actor, userId: string) => {
  if (actor.global_role === "Admin" || actor.global_role === "Superadmin") return true;
  if (actor.department_role !== "Head" && actor.department_role !== "Supervisor") return false;

  const intern = await User.findById(userId).select("departments").lean();
  return Boolean(
    intern && actor.department_id &&
      intern.departments?.some((department) => String(department.department_id) === String(actor.department_id)),
  );
};

export type OffboardingReadiness = {
  hours_complete: boolean;
  tasks_complete: boolean;
  deliverables_approved: boolean;
  evaluation_complete: boolean;
  no_pending_extension: boolean;
  blockers: string[];
};

const isRequirementsOverrideAllowed = (actor: Actor) =>
  actor.global_role === "Admin" || actor.global_role === "Superadmin";

const actionableBlockers = (readiness: OffboardingReadiness, actor: Actor) =>
  isRequirementsOverrideAllowed(actor)
    ? []
    : readiness.blockers;

const getReadiness = async (userId: string): Promise<OffboardingReadiness> => {
  const userObjectId = toObjectId(userId);
  const [profile, assignments, evaluationCount, pendingExtension, driveLinks] = await Promise.all([
    InternProfile.findOne({ user_id: userObjectId }).lean(),
    TaskAssignment.find({ assigned_to: userObjectId }).select("task_id").lean(),
    InternEvaluation.countDocuments({ user_id: userObjectId }),
    ExtensionRequest.exists({ intern_id: userObjectId, status: "pending" }),
    TaskWorkLink.find({ submitted_by: userObjectId, platform: "drive" }).select("status").lean(),
  ]);

  if (!profile) throw new Error("Intern profile not found.");

  const taskIds = assignments.map((assignment) => assignment.task_id);
  const tasks = taskIds.length
    ? await Task.find({ _id: { $in: taskIds } }).select("status").lean()
    : [];
  const hoursComplete = (profile.rendered_hours_total ?? 0) >= profile.required_hours;
  const tasksComplete = tasks.every((task) => task.status === "Completed");
  const deliverablesApproved = driveLinks.length > 0 && driveLinks.every((link) => link.status === "approved");
  const evaluationComplete = evaluationCount > 0;
  const noPendingExtension = !pendingExtension;
  const blockers: string[] = [];

  if (!hoursComplete) blockers.push("Required internship hours are not complete.");
  if (!tasksComplete) blockers.push("All assigned tasks must be completed.");
  if (!deliverablesApproved) blockers.push("At least one Google Drive deliverable must be submitted and approved.");
  if (!evaluationComplete) blockers.push("A final evaluation is required.");
  if (!noPendingExtension) blockers.push("A pending extension request must be resolved first.");

  return {
    hours_complete: hoursComplete,
    tasks_complete: tasksComplete,
    deliverables_approved: deliverablesApproved,
    evaluation_complete: evaluationComplete,
    no_pending_extension: noPendingExtension,
    blockers,
  };
};

export const listOffboardingCandidates = async (actor: Actor) => {
  const canManage = actor.global_role === "Admin" || actor.global_role === "Superadmin" ||
    actor.department_role === "Head" || actor.department_role === "Supervisor";
  if (!canManage) throw new Error("Insufficient permissions to review offboarding interns.");

  const now = new Date();
  const eligibleBatches = await Batch.find({ start_date: { $lte: now }, is_archived: { $ne: true } }).select("_id").lean();
  const activeAssignments = await BatchAssignment.find({
    batch_id: { $in: eligibleBatches.map((batch) => batch._id) },
    status: "Active",
  }).select("user_id").lean();
  const users = await User.find({
    _id: { $in: activeAssignments.map((assignment) => assignment.user_id) },
    is_active: true,
    departments: { $elemMatch: { department_role: "Intern" } },
  }).select("first_name last_name email departments").lean();

  const scopedUsers = users.filter((user) =>
    actor.global_role === "Admin" || actor.global_role === "Superadmin" ||
    user.departments?.some((department) => String(department.department_id) === String(actor.department_id)),
  );
  const profiles = await InternProfile.find({
    user_id: { $in: scopedUsers.map((user) => user._id) },
    is_archived: { $ne: true },
  }).select("user_id rendered_hours_total required_hours").lean();
  const profileMap = new Map(profiles.map((profile) => [String(profile.user_id), profile]));

  return Promise.all(scopedUsers.map(async (user) => {
    const profile = profileMap.get(String(user._id));
    if (!profile) return null;
    const readiness = await getReadiness(String(user._id));
    return {
      user_id: String(user._id),
      name: `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email,
      email: user.email,
      completed_hours: profile.rendered_hours_total ?? 0,
      required_hours: profile.required_hours,
      ready: readiness.blockers.length === 0,
      can_override_requirements: isRequirementsOverrideAllowed(actor) && readiness.blockers.length > 0,
      blockers: readiness.blockers,
    };
  })).then((items) => items.filter(Boolean));
};

export const approveOffboarding = async (actor: Actor, userId: string) => {
  if (!(await canManageIntern(actor, userId))) {
    throw new Error("Insufficient permissions to approve this intern's offboarding.");
  }

  const profile = await InternProfile.findOne({ user_id: toObjectId(userId) }).select("is_archived").lean();
  if (!profile) throw new Error("Intern profile not found.");
  if (profile.is_archived) throw new Error("Intern is already archived.");

  const readiness = await getReadiness(userId);
  const blockers = actionableBlockers(readiness, actor);
  if (blockers.length > 0) {
    throw new Error(`Offboarding cannot be approved: ${blockers.join(" ")}`);
  }

  const assignment = await BatchAssignment.findOne({ user_id: toObjectId(userId) });
  if (!assignment) throw new Error("Intern must be assigned to a batch before offboarding can be approved.");
  if (assignment.status !== "Active") throw new Error("Only active batch members can be offboarded.");
  const batch = await Batch.findById(assignment.batch_id).select("start_date is_archived").lean();
  if (!batch || batch.is_archived || batch.start_date > new Date()) {
    throw new Error("Only interns in a started, active batch can be offboarded.");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const transactionalAssignment = await BatchAssignment.findById(assignment._id).session(session);
      if (!transactionalAssignment || transactionalAssignment.status !== "Active") {
        throw new Error("Only active batch members can be offboarded.");
      }

      transactionalAssignment.status = "Completed";
      transactionalAssignment.status_updated_at = new Date();
      await transactionalAssignment.save({ session });

      await archiveIntern(actor, userId, { override: isRequirementsOverrideAllowed(actor) }, {
        session,
        skipProfileResponse: true,
      });

      await User.updateOne({ _id: toObjectId(userId) }, { $set: { is_active: false } }, { session });
    });
  } finally {
    await session.endSession();
  }

  return getAlumniProfile(userId);
};
