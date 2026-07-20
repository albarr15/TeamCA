// file: backend/src/controllers/offboardingController.ts
// Handles the /offboarding/drive-links endpoints.
// Delegates to existing taskService functions to avoid duplicating RBAC logic.

import type { Request, Response } from "express";
import type {
  AddDriveLinkPayload,
  ReviewDriveLinkPayload,
  ListDriveLinksQuery,
} from "../schemas/taskSchemas.js";
import {
  addTaskWorkLink,
  listDriveLinksForActor,
  reviewTaskWorkLink,
} from "../services/taskService.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import TaskWorkLink from "../models/TaskWorkLink.js";
import { createNotificationsForRecipients } from "../services/notificationService.js";
import { emitUsersNotification } from "../socket/io.js";

// ---------------------------------------------------------------------------
// GET /offboarding/drive-links
// Returns all Google Drive deliverable links visible to the current user.
// ---------------------------------------------------------------------------

export const listOffboardingDriveLinksHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // req.query has already been validated + coerced by validateRequest middleware.
    const { departmentId, status } = req.query as unknown as ListDriveLinksQuery;
    const links = await listDriveLinksForActor(req.user, { departmentId, status });
    return res.status(200).json(links);
  } catch (_error) {
    return res
      .status(500)
      .json({ message: "Failed to load offboarding drive links." });
  }
};

// ---------------------------------------------------------------------------
// POST /offboarding/drive-links
// Submits a new Google Drive link for a specific task.
// Delegates to the existing addTaskWorkLink service (includes all RBAC).
// ---------------------------------------------------------------------------

export const submitDriveLinkHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // req.body is guaranteed valid by validateRequest middleware
    const payload = req.body as AddDriveLinkPayload;

    const workLink = await addTaskWorkLink(req.user, {
      taskId: payload.task_id,
      url: payload.url,
      label: payload.label,
    });

    return res.status(201).json(workLink);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Task not found.") {
        return res.status(404).json({ message: error.message });
      }
      if (
        error.message.includes("do not have permission") ||
        error.message.includes("Only users assigned")
      ) {
        return res.status(403).json({ message: error.message });
      }
      // Bubble up any other domain logic errors as 400 Bad Request
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to submit drive link." });
  }
};

// ---------------------------------------------------------------------------
// PATCH /offboarding/drive-links/:workLinkId/review
// Approves or rejects a Google Drive deliverable link.
// Verifies the link is platform "drive" before delegating to reviewTaskWorkLink.
// ---------------------------------------------------------------------------

export const reviewDriveLinkHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const rawWorkLinkId = req.params.workLinkId;
    const workLinkId = Array.isArray(rawWorkLinkId)
      ? rawWorkLinkId[0]
      : rawWorkLinkId;
    if (!workLinkId) {
      return res.status(400).json({ message: "workLinkId is required." });
    }

    // Fetch the link to confirm it is a drive link and to get its task_id.
    const existingLink = await TaskWorkLink.findById(workLinkId)
      .select("platform task_id submitted_by")
      .lean();

    if (!existingLink) {
      return res.status(404).json({ message: "Work link not found." });
    }
    if (existingLink.platform !== "drive") {
      return res.status(400).json({
        message: "This endpoint only reviews Google Drive deliverable links.",
      });
    }

    const taskId = String(existingLink.task_id);
    const payload = req.body as ReviewDriveLinkPayload;

    const reviewed = await reviewTaskWorkLink(req.user, {
      taskId,
      workLinkId,
      status: payload.status,
      review_notes: payload.review_notes,
    });

    // Notify the submitter (mirrors reviewTaskWorkLinkHandler pattern)
    const actorId = String(req.user.user_id);
    const submitterId = String(existingLink.submitted_by);
    if (submitterId && submitterId !== actorId) {
      const [task, actorUser] = await Promise.all([
        Task.findById(taskId).select("title").lean(),
        User.findById(actorId).select("first_name last_name email").lean(),
      ]);
      if (task) {
        const actorName = actorUser
          ? `${actorUser.first_name || ""} ${actorUser.last_name || ""}`.trim() ||
            actorUser.email
          : "Your supervisor";
        const statusLabel =
          payload.status === "approved"
            ? "approved"
            : payload.status === "rejected"
              ? "rejected"
              : "requested revisions for";
        const statusTitle =
          payload.status === "approved"
            ? "Deliverable Approved"
            : payload.status === "rejected"
              ? "Deliverable Rejected"
              : "Revision Requested";
        const notifications = await createNotificationsForRecipients(
          [submitterId],
          {
            actorId,
            eventType: "task_deliverable_reviewed",
            title: statusTitle,
            message: `${actorName} ${statusLabel} your Google Drive deliverable for "${task.title}".`,
            entityType: "task",
            entityId: taskId,
            metadata: {
              task_id: taskId,
              work_link_id: workLinkId,
              review_status: payload.status,
              task_title: task.title,
            },
          },
        );
        for (const notification of notifications) {
          emitUsersNotification([notification.recipient_id], notification);
        }
      }
    }

    return res.status(200).json(reviewed);
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Task not found." ||
        error.message === "Work link not found."
      ) {
        return res.status(404).json({ message: error.message });
      }
      if (
        error.message.includes("do not have permission") ||
        error.message.includes("Only Supervisors")
      ) {
        return res.status(403).json({ message: error.message });
      }
      // Bubble up any other domain logic errors as 400 Bad Request
      return res.status(400).json({ message: error.message });
    }
    return res
      .status(500)
      .json({ message: "Failed to review drive link." });
  }
};
