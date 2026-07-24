// backend/src/models/Notification.ts
// UPDATED: added leave_* event types to NotificationEventType union and schema enum

import mongoose, { Document, Schema, Types } from "mongoose";

export type NotificationEventType =
  // ── existing task events ──────────────────────────────────────────────────
  | "task_comment_created"
  | "task_feedback_added"
  | "task_assignment_added"
  | "task_assignment_removed"
  | "task_reassigned"
  | "task_status_changed"
  | "task_moved_back"
  | "task_status_under_review"
  | "task_status_completed"
  | "task_details_updated"
  | "task_deleted"
  | "task_due_today"
  | "task_overdue"
  | "task_review_required"
  | "task_deliverable_reviewed"
  // ── existing user events ──────────────────────────────────────────────────
  | "user_profile_updated"
  | "user_role_changed"
  | "user_activation_changed"
  | "user_deleted"
  | "intern_profile_updated"
  // ── NEW: leave events ─────────────────────────────────────────────────────
  | "leave_submitted" // notifies admin/heads when a user files a leave
  | "leave_approved" // notifies the applicant when leave is approved
  | "leave_rejected" // notifies the applicant when leave is rejected
  | "leave_cancelled" // notifies admin/heads when a user cancels their leave
  // ── NEW: internship extension request events ─────────────────────────────
  | "extension_request_submitted" // notifies reviewers when a new request is filed
  | "extension_request_approved" // notifies the intern when their request is approved
  | "extension_request_rejected" // notifies the intern when their request is rejected
  // ── DTR reminder events ───────────────────────────────────────────────────
  | "dtr_clock_in_reminder"
  | "dtr_clock_out_reminder";

export interface INotification extends Document {
  recipient_id: Types.ObjectId;
  actor_id?: Types.ObjectId;
  event_type: NotificationEventType;
  title: string;
  message: string;
  entity_type?: "task" | "user" | "leave" | "extension_request";
  entity_id?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  read_at?: Date;
  created_at: Date;
}

const notificationSchema = new Schema<INotification>({
  recipient_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  actor_id: { type: Schema.Types.ObjectId, ref: "User" },
  event_type: {
    type: String,
    enum: [
      // task
      "task_comment_created",
      "task_feedback_added",
      "task_assignment_added",
      "task_assignment_removed",
      "task_reassigned",
      "task_status_changed",
      "task_moved_back",
      "task_status_under_review",
      "task_status_completed",
      "task_details_updated",
      "task_deleted",
      "task_due_today",
      "task_overdue",
      "task_review_required",
      "task_deliverable_reviewed",
      // user
      "user_profile_updated",
      "user_role_changed",
      "user_activation_changed",
      "user_deleted",
      "intern_profile_updated",
      // leave (new)
      "leave_submitted",
      "leave_approved",
      "leave_rejected",
      "leave_cancelled",
      // extension requests (new)
      "extension_request_submitted",
      "extension_request_approved",
      "extension_request_rejected",
      "dtr_clock_in_reminder",
      "dtr_clock_out_reminder",
    ],
    required: true,
    index: true,
  },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  entity_type: { type: String, enum: ["task", "user", "leave", "extension_request"] },
  entity_id: { type: Schema.Types.ObjectId },
  metadata: { type: Schema.Types.Mixed },
  is_read: { type: Boolean, default: false, index: true },
  read_at: { type: Date },
  created_at: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
});

notificationSchema.index({ recipient_id: 1, created_at: -1 });
notificationSchema.index({ recipient_id: 1, is_read: 1, created_at: -1 });
// Used by the deduplication query in notificationService
notificationSchema.index(
  { recipient_id: 1, event_type: 1, entity_id: 1, created_at: -1 },
  { name: "dedup_lookup" },
);

export default mongoose.model<INotification>(
  "Notification",
  notificationSchema,
);