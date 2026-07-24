// file: backend/src/services/extensionService.ts
// Business logic for the Internship Extension Request workflow.
//
// Responsibilities:
//   • Create requests (self-filed by an intern, or filed on their behalf by
//     a Head/Supervisor/Admin/Superadmin).
//   • List requests ("my requests" for interns, "pending queue" for reviewers).
//   • Approve / reject / cancel, each appending an entry to the request's
//     history log.
//   • On approval, bump the intern's InternProfile.required_hours — the
//     expected_completion_date shown elsewhere in the app is derived from
//     required_hours, so no separate date field needs to be maintained here.

import { Types } from "mongoose";
import ExtensionRequest, {
  type IExtensionRequest,
} from "../models/ExtensionRequest.js";
import InternProfile from "../models/InternProfile.js";
import User from "../models/User.js";
import { updateInternProfileByUserId } from "./internProfileService.js";

type ActorRole = "Superadmin" | "Admin" | "Standard_User";
type ActorDepartmentRole = "Head" | "Supervisor" | "Intern" | undefined;

const canManageGlobally = (globalRole: ActorRole): boolean =>
  globalRole === "Superadmin" || globalRole === "Admin";

const canManageDepartment = (departmentRole?: ActorDepartmentRole): boolean =>
  departmentRole === "Head" || departmentRole === "Supervisor";

const resolveActorName = async (userId: string): Promise<string> => {
  const user = await User.findById(userId)
    .select("first_name last_name email")
    .lean();
  if (!user) return "Unknown user";
  const name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return name || user.email || "Unknown user";
};

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

const normalizeRequest = (doc: IExtensionRequest) => ({
  extension_request_id: String(doc._id),
  intern_id: String(doc.intern_id),
  requested_by: String(doc.requested_by),
  department_id: doc.department_id ? String(doc.department_id) : null,
  additional_hours: doc.additional_hours,
  previous_required_hours: doc.previous_required_hours,
  new_required_hours: doc.new_required_hours,
  reason: doc.reason,
  status: doc.status,
  reviewed_by: doc.reviewed_by ? String(doc.reviewed_by) : null,
  reviewed_at: doc.reviewed_at ?? null,
  rejection_reason: doc.rejection_reason ?? null,
  history: (doc.history || []).map((entry) => ({
    action: entry.action,
    actor_id: String(entry.actor_id),
    actor_name: entry.actor_name,
    remarks: entry.remarks ?? null,
    timestamp: entry.timestamp,
  })),
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

export type NormalizedExtensionRequest = ReturnType<typeof normalizeRequest>;

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export const createExtensionRequest = async (
  actor: Express.AuthUser,
  input: { internId?: string; additionalHours: number; reason: string },
): Promise<NormalizedExtensionRequest> => {
  const actorId = String(actor.user_id);
  const targetInternId = input.internId?.trim() || actorId;
  const isSelfRequest = targetInternId === actorId;

  const targetUser = await User.findById(targetInternId)
    .select("departments")
    .lean();
  if (!targetUser) {
    throw new Error("Intern not found.");
  }

  if (!isSelfRequest) {
    // Filing on someone else's behalf requires management privileges over
    // that person: Admin/Superadmin globally, or Head/Supervisor sharing a
    // department with the target intern.
    const sharesDepartment = (targetUser.departments || []).some(
      (d) => String(d.department_id) === String(actor.department_id),
    );
    const allowed =
      canManageGlobally(actor.global_role) ||
      (canManageDepartment(actor.department_role) && sharesDepartment);

    if (!allowed) {
      throw new Error(
        "You do not have permission to request an extension for this user.",
      );
    }
  }

  const profile = await InternProfile.findOne({ user_id: targetInternId });
  if (!profile) {
    throw new Error(
      "Intern profile not found. Cannot request an extension without an existing profile.",
    );
  }

  const existingPending = await ExtensionRequest.findOne({
    intern_id: targetInternId,
    status: "pending",
  }).lean();
  if (existingPending) {
    throw new Error("An extension request is already pending for this intern.");
  }

  const previousRequiredHours = profile.required_hours;
  const newRequiredHours = previousRequiredHours + input.additionalHours;
  const requesterName = await resolveActorName(actorId);
  const departmentId = targetUser.departments?.[0]?.department_id;

  const request = await ExtensionRequest.create({
    intern_id: targetInternId,
    requested_by: actorId,
    department_id: departmentId,
    additional_hours: input.additionalHours,
    previous_required_hours: previousRequiredHours,
    new_required_hours: newRequiredHours,
    reason: input.reason,
    status: "pending",
    history: [
      {
        action: "submitted",
        actor_id: new Types.ObjectId(actorId),
        actor_name: requesterName,
        remarks: input.reason,
        timestamp: new Date(),
      },
    ],
  });

  return normalizeRequest(request);
};

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

/** All extension requests filed for a given intern, most recent first. */
export const getMyExtensionRequests = async (
  internId: string,
): Promise<NormalizedExtensionRequest[]> => {
  const requests = await ExtensionRequest.find({ intern_id: internId }).sort({
    createdAt: -1,
  });
  return requests.map(normalizeRequest);
};

/**
 * Pending extension requests scoped to the reviewer's role:
 * - Admin/Superadmin → all pending requests (optionally filtered by department)
 * - Head/Supervisor  → pending requests in their own department only
 */
export const getPendingExtensionRequests = async (
  actor: Express.AuthUser,
  filter: { departmentId?: string } = {},
): Promise<NormalizedExtensionRequest[]> => {
  const query: Record<string, unknown> = { status: "pending" };

  if (canManageGlobally(actor.global_role)) {
    if (filter.departmentId) {
      query.department_id = filter.departmentId;
    }
  } else if (canManageDepartment(actor.department_role)) {
    if (!actor.department_id) {
      return [];
    }
    query.department_id = actor.department_id;
  } else {
    // Interns cannot list the review queue.
    throw new Error(
      "You do not have permission to view pending extension requests.",
    );
  }

  const requests = await ExtensionRequest.find(query).sort({ createdAt: -1 });
  return requests.map(normalizeRequest);
};

// ---------------------------------------------------------------------------
// Review (approve / reject)
// ---------------------------------------------------------------------------

const canReviewRequest = (
  actor: Express.AuthUser,
  request: IExtensionRequest,
): boolean => {
  if (canManageGlobally(actor.global_role)) return true;
  return (
    canManageDepartment(actor.department_role) &&
    !!request.department_id &&
    String(actor.department_id) === String(request.department_id)
  );
};

export const approveExtensionRequest = async (input: {
  requestId: string;
  actor: Express.AuthUser;
  remarks?: string;
}): Promise<NormalizedExtensionRequest> => {
  const request = await ExtensionRequest.findById(input.requestId);
  if (!request) {
    throw new Error("Extension request not found.");
  }
  if (!canReviewRequest(input.actor, request)) {
    throw new Error(
      "You do not have permission to review this extension request.",
    );
  }
  if (request.status !== "pending") {
    throw new Error("Cannot review a request that is not pending.");
  }

  const actorId = String(input.actor.user_id);
  const reviewerName = await resolveActorName(actorId);

  // Bump the intern's required hours. Re-read the live profile in case it
  // changed since the request was filed, applying the same delta requested.
  await updateInternProfileByUserId(String(request.intern_id), {
    required_hours: request.new_required_hours,
  });

  request.status = "approved";
  request.reviewed_by = new Types.ObjectId(actorId);
  request.reviewed_at = new Date();
  request.history.push({
    action: "approved",
    actor_id: new Types.ObjectId(actorId),
    actor_name: reviewerName,
    remarks: input.remarks?.trim() || undefined,
    timestamp: new Date(),
  });

  await request.save();
  return normalizeRequest(request);
};

export const rejectExtensionRequest = async (input: {
  requestId: string;
  actor: Express.AuthUser;
  rejectionReason: string;
}): Promise<NormalizedExtensionRequest> => {
  const request = await ExtensionRequest.findById(input.requestId);
  if (!request) {
    throw new Error("Extension request not found.");
  }
  if (!canReviewRequest(input.actor, request)) {
    throw new Error(
      "You do not have permission to review this extension request.",
    );
  }
  if (request.status !== "pending") {
    throw new Error("Cannot review a request that is not pending.");
  }
  if (!input.rejectionReason?.trim()) {
    throw new Error("remarks is required when rejecting an extension request.");
  }

  const actorId = String(input.actor.user_id);
  const reviewerName = await resolveActorName(actorId);

  request.status = "rejected";
  request.reviewed_by = new Types.ObjectId(actorId);
  request.reviewed_at = new Date();
  request.rejection_reason = input.rejectionReason.trim();
  request.history.push({
    action: "rejected",
    actor_id: new Types.ObjectId(actorId),
    actor_name: reviewerName,
    remarks: input.rejectionReason.trim(),
    timestamp: new Date(),
  });

  await request.save();
  return normalizeRequest(request);
};

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

/** Only the original requester or the intern themselves may cancel, and only while pending. */
export const cancelExtensionRequest = async (
  actor: Express.AuthUser,
  requestId: string,
): Promise<NormalizedExtensionRequest> => {
  const request = await ExtensionRequest.findById(requestId);
  if (!request) {
    throw new Error("Extension request not found.");
  }

  const actorId = String(actor.user_id);
  const isRequester = String(request.requested_by) === actorId;
  const isTargetIntern = String(request.intern_id) === actorId;
  const isPrivileged =
    canManageGlobally(actor.global_role) || canReviewRequest(actor, request);

  if (!isRequester && !isTargetIntern && !isPrivileged) {
    throw new Error("You do not have permission to cancel this extension request.");
  }
  if (request.status !== "pending") {
    throw new Error("Only pending extension requests can be cancelled.");
  }

  const actorName = await resolveActorName(actorId);

  request.status = "cancelled";
  request.history.push({
    action: "cancelled",
    actor_id: new Types.ObjectId(actorId),
    actor_name: actorName,
    timestamp: new Date(),
  });

  await request.save();
  return normalizeRequest(request);
};