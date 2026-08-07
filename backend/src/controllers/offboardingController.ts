// file: backend/src/controllers/offboardingController.ts
// Handles the /offboarding/drive-links endpoints.
// Delegates to existing taskService functions to avoid duplicating RBAC logic.

import type { Request, Response } from "express";
import type {
  AddDriveLinkPayload,
  ReviewDriveLinkPayload,
  ListDriveLinksQuery,
} from "../schemas/taskSchemas.js";
import type { ClearanceTimelineQuery } from "../schemas/clearanceSchemas.js";
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
import {
  approveOffboarding,
  listOffboardingCandidates,
  getClearanceTimeline,
} from "../services/offboardingApprovalService.js";
import { getReadinessScore } from "../services/readinessScoreService.js";

export const listOffboardingCandidatesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    return res.status(200).json(await listOffboardingCandidates(req.user));
  } catch (error) {
    return res.status(error instanceof Error && error.message.includes("permissions") ? 403 : 500)
      .json({ message: error instanceof Error ? error.message : "Failed to load offboarding candidates." });
  }
};

export const approveOffboardingHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const value = req.params.userId;
    const userId = Array.isArray(value) ? value[0] : value;
    if (!userId) return res.status(400).json({ message: "userId is required." });
    return res.status(200).json(await approveOffboarding(req.user, userId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve offboarding.";
    const status = message.includes("permissions") ? 403 :
      message.includes("not found") || message.includes("must be assigned") ? 404 : 400;
    return res.status(status).json({ message });
  }
};

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

// ---------------------------------------------------------------------------
// GET /offboarding/clearance-timeline/me
// Returns the authenticated intern's own clearance approval timeline.
// ---------------------------------------------------------------------------

export const getMyClearanceTimelineHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const { status } = req.query as unknown as ClearanceTimelineQuery;
    const timeline = await getClearanceTimeline(req.user, String(req.user.user_id), { status });
    return res.status(200).json(timeline);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load clearance timeline.";
    return res.status(message.includes("permissions") ? 403 : 500).json({ message });
  }
};

// ---------------------------------------------------------------------------
// GET /offboarding/clearance-timeline/:userId
// Returns a specific intern's clearance approval timeline. Restricted to
// reviewers (Head/Supervisor scoped to their department, Admin/Superadmin
// unrestricted) via canManageIntern inside the service.
// ---------------------------------------------------------------------------

export const getClearanceTimelineHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const value = req.params.userId;
    const userId = Array.isArray(value) ? value[0] : value;
    if (!userId) return res.status(400).json({ message: "userId is required." });
    const { status } = req.query as unknown as ClearanceTimelineQuery;
    const timeline = await getClearanceTimeline(req.user, userId, { status });
    return res.status(200).json(timeline);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load clearance timeline.";
    return res.status(message.includes("permissions") ? 403 : 500).json({ message });
  }
};

// ---------------------------------------------------------------------------
// GET /offboarding/readiness-score/me
// Returns the authenticated intern's own Internship Completion Readiness
// Score — a weighted percentage (hours, tasks, attendance, deliverables)
// used to display progress on the intern dashboard. This is separate from
// the strict all-or-nothing gate enforced in offboardingApprovalService's
// getReadiness()/approveOffboarding().
// ---------------------------------------------------------------------------

export const getMyReadinessScoreHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const score = await getReadinessScore(String(req.user.user_id));
    return res.status(200).json(score);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to compute readiness score.";
    return res.status(message.includes("not found") ? 404 : 500).json({ message });
  }
};

// ---------------------------------------------------------------------------
// GET /offboarding/readiness-score/:userId
// Returns a specific intern's Readiness Score. Restricted to reviewers
// (Head/Supervisor/Admin/Superadmin), matching the access pattern used for
// candidates/clearance-timeline elsewhere in this controller.
// ---------------------------------------------------------------------------

export const getReadinessScoreHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const value = req.params.userId;
    const userId = Array.isArray(value) ? value[0] : value;
    if (!userId) return res.status(400).json({ message: "userId is required." });
    const score = await getReadinessScore(userId);
    return res.status(200).json(score);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to compute readiness score.";
    return res.status(message.includes("not found") ? 404 : 500).json({ message });
  }
};