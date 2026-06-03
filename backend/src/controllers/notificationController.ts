import type { Request, Response } from "express";
import { z } from "zod";
import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../services/notificationService.js";

const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unread_only: z.coerce.boolean().optional(),
});

// All preference keys accept a boolean value
const notificationPreferencesSchema = z.object({
  task_comment_created:     z.boolean().optional(),
  task_feedback_added:      z.boolean().optional(),
  task_assignment_added:    z.boolean().optional(),
  task_assignment_removed:  z.boolean().optional(),
  task_reassigned:          z.boolean().optional(),
  task_status_changed:      z.boolean().optional(),
  task_moved_back:          z.boolean().optional(),
  task_status_under_review: z.boolean().optional(),
  task_status_completed:    z.boolean().optional(),
  task_details_updated:     z.boolean().optional(),
  task_deleted:             z.boolean().optional(),
  task_due_today:           z.boolean().optional(),
  task_overdue:             z.boolean().optional(),
  task_review_required:     z.boolean().optional(),
  user_profile_updated:     z.boolean().optional(),
  user_role_changed:        z.boolean().optional(),
  user_activation_changed:  z.boolean().optional(),
  user_deleted:             z.boolean().optional(),
  intern_profile_updated:   z.boolean().optional(),
  leave_submitted:          z.boolean().optional(),
  leave_approved:           z.boolean().optional(),
  leave_rejected:           z.boolean().optional(),
  leave_cancelled:          z.boolean().optional(),
  dtr_clock_in_reminder:    z.boolean().optional(),
  dtr_clock_out_reminder:   z.boolean().optional(),
});

export const listNotificationsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const query = listNotificationsQuerySchema.parse(req.query);
    const payload = await listNotifications(String(req.user.user_id), {
      page: query.page,
      limit: query.limit,
      unreadOnly: query.unread_only,
    });

    return res.status(200).json(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid query params.", issues: error.issues });
    }

    return res.status(500).json({ message: "Failed to load notifications." });
  }
};

export const markNotificationAsReadHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const rawNotificationId = req.params.notificationId;
    const notificationId = Array.isArray(rawNotificationId)
      ? rawNotificationId[0]
      : rawNotificationId;

    if (!notificationId) {
      return res.status(400).json({ message: "notificationId is required." });
    }

    const updated = await markNotificationAsRead(
      String(req.user.user_id),
      notificationId,
    );
    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Notification not found.") {
      return res.status(404).json({ message: error.message });
    }

    return res.status(500).json({ message: "Failed to update notification." });
  }
};

export const markAllNotificationsAsReadHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const result = await markAllNotificationsAsRead(String(req.user.user_id));
    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ message: "Failed to update notifications." });
  }
};

export const getNotificationPreferencesHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const prefs = await getNotificationPreferences(String(req.user.user_id));
    return res.status(200).json(prefs);
  } catch (error) {
    if (error instanceof Error && error.message === "User not found.") {
      return res.status(404).json({ message: error.message });
    }

    return res
      .status(500)
      .json({ message: "Failed to load notification preferences." });
  }
};

export const updateNotificationPreferencesHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const updates = notificationPreferencesSchema.parse(req.body);
    const prefs = await updateNotificationPreferences(
      String(req.user.user_id),
      updates,
    );
    return res.status(200).json(prefs);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid preference values.", issues: error.issues });
    }

    if (error instanceof Error && error.message === "User not found.") {
      return res.status(404).json({ message: error.message });
    }

    return res
      .status(500)
      .json({ message: "Failed to update notification preferences." });
  }
};