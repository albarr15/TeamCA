// file: backend/src/controllers/extensionController.ts
// Handles the /offboarding/extension-requests endpoints.

import type { Request, Response } from "express";
import type {
  CreateExtensionRequestPayload,
  ReviewExtensionRequestPayload,
  ListExtensionRequestsQuery,
} from "../schemas/extensionSchemas.js";
import {
  createExtensionRequest,
  getMyExtensionRequests,
  getPendingExtensionRequests,
  approveExtensionRequest,
  rejectExtensionRequest,
  cancelExtensionRequest,
} from "../services/extensionService.js";
import User from "../models/User.js";
import { createNotificationsForRecipients } from "../services/notificationService.js";
import { emitUsersNotification } from "../socket/io.js";

const getRouteParam = (
  value: string | string[] | undefined,
): string | null => {
  if (!value || Array.isArray(value)) return null;
  return value;
};

/** Admins/Superadmins globally, plus Heads/Supervisors within a department. */
const findReviewerIds = async (departmentId: string | null): Promise<string[]> => {
  const globalManagers = await User.find({
    global_role: { $in: ["Admin", "Superadmin"] },
  })
    .select("_id")
    .lean();

  let departmentManagers: { _id: unknown }[] = [];
  if (departmentId) {
    departmentManagers = await User.find({
      "departments.department_id": departmentId,
      "departments.department_role": { $in: ["Head", "Supervisor"] },
    })
      .select("_id")
      .lean();
  }

  return [
    ...new Set(
      [...globalManagers, ...departmentManagers].map((u) => String(u._id)),
    ),
  ];
};

// ---------------------------------------------------------------------------
// POST /offboarding/extension-requests
// ---------------------------------------------------------------------------

export const createExtensionRequestHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const payload = req.body as CreateExtensionRequestPayload;

    const request = await createExtensionRequest(req.user, {
      internId: payload.intern_id,
      additionalHours: payload.additional_hours,
      reason: payload.reason,
    });

    // Notify reviewers (Heads/Supervisors of the department + all Admins/Superadmins).
    const actorId = String(req.user.user_id);
    const reviewerIds = (await findReviewerIds(request.department_id)).filter(
      (id) => id !== actorId,
    );
    if (reviewerIds.length > 0) {
      const notifications = await createNotificationsForRecipients(
        reviewerIds,
        {
          actorId,
          eventType: "extension_request_submitted",
          title: "Extension Request Submitted",
          message: `A new internship extension request (+${request.additional_hours} hrs) is awaiting your review.`,
          entityType: "extension_request",
          entityId: request.extension_request_id,
          metadata: {
            extension_request_id: request.extension_request_id,
            intern_id: request.intern_id,
            additional_hours: request.additional_hours,
          },
        },
      );
      for (const notification of notifications) {
        emitUsersNotification([notification.recipient_id], notification);
      }
    }

    return res.status(201).json(request);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("do not have permission")) {
        return res.status(403).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res
      .status(500)
      .json({ message: "Failed to submit extension request." });
  }
};

// ---------------------------------------------------------------------------
// GET /offboarding/extension-requests/me
// ---------------------------------------------------------------------------

export const getMyExtensionRequestsHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const requests = await getMyExtensionRequests(String(req.user.user_id));
    return res.status(200).json(requests);
  } catch (_error) {
    return res
      .status(500)
      .json({ message: "Failed to load extension requests." });
  }
};

// ---------------------------------------------------------------------------
// GET /offboarding/extension-requests/pending
// ---------------------------------------------------------------------------

export const getPendingExtensionRequestsHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const { departmentId } = req.query as unknown as ListExtensionRequestsQuery;
    const requests = await getPendingExtensionRequests(req.user, {
      departmentId,
    });
    return res.status(200).json(requests);
  } catch (error) {
    if (error instanceof Error && error.message.includes("do not have permission")) {
      return res.status(403).json({ message: error.message });
    }
    return res
      .status(500)
      .json({ message: "Failed to load pending extension requests." });
  }
};

// ---------------------------------------------------------------------------
// PATCH /offboarding/extension-requests/:requestId/review
// ---------------------------------------------------------------------------

export const reviewExtensionRequestHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const requestId = getRouteParam(req.params.requestId);
    if (!requestId) {
      return res.status(400).json({ message: "requestId is required." });
    }

    const payload = req.body as ReviewExtensionRequestPayload;

    let request;
    if (payload.status === "approved") {
      request = await approveExtensionRequest({
        requestId,
        actor: req.user,
        remarks: payload.remarks,
      });
    } else {
      if (!payload.remarks?.trim()) {
        return res.status(400).json({
          message: "remarks is required when rejecting an extension request.",
        });
      }
      request = await rejectExtensionRequest({
        requestId,
        actor: req.user,
        rejectionReason: payload.remarks,
      });
    }

    // Notify the intern (and the requester, if a different person filed it).
    const actorId = String(req.user.user_id);
    const recipients = [...new Set([request.intern_id, request.requested_by])].filter(
      (id) => id !== actorId,
    );
    if (recipients.length > 0) {
      const eventType =
        payload.status === "approved"
          ? "extension_request_approved"
          : "extension_request_rejected";
      const notifications = await createNotificationsForRecipients(
        recipients,
        {
          actorId,
          eventType,
          title:
            payload.status === "approved"
              ? "Extension Request Approved"
              : "Extension Request Rejected",
          message:
            payload.status === "approved"
              ? `Your internship extension request was approved. Required hours updated to ${request.new_required_hours}.`
              : `Your internship extension request was rejected.${
                  payload.remarks ? ` Reason: ${payload.remarks}` : ""
                }`,
          entityType: "extension_request",
          entityId: request.extension_request_id,
          metadata: {
            extension_request_id: request.extension_request_id,
            status: request.status,
          },
        },
      );
      for (const notification of notifications) {
        emitUsersNotification([notification.recipient_id], notification);
      }
    }

    return res.status(200).json(request);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("do not have permission")) {
        return res.status(403).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res
      .status(500)
      .json({ message: "Failed to review extension request." });
  }
};

// ---------------------------------------------------------------------------
// PATCH /offboarding/extension-requests/:requestId/cancel
// ---------------------------------------------------------------------------

export const cancelExtensionRequestHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const requestId = getRouteParam(req.params.requestId);
    if (!requestId) {
      return res.status(400).json({ message: "requestId is required." });
    }

    const request = await cancelExtensionRequest(req.user, requestId);
    return res.status(200).json(request);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("do not have permission")) {
        return res.status(403).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res
      .status(500)
      .json({ message: "Failed to cancel extension request." });
  }
};