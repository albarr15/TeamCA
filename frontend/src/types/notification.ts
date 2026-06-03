export type NotificationEventType =
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
  | "user_profile_updated"
  | "user_role_changed"
  | "user_activation_changed"
  | "user_deleted"
  | "intern_profile_updated"
  | "leave_submitted"
  | "leave_approved"
  | "leave_rejected"
  | "leave_cancelled"
  | "dtr_clock_in_reminder"
  | "dtr_clock_out_reminder";

export interface NotificationItem {
  notification_id: string;
  recipient_id: string;
  actor_id?: string;
  event_type: NotificationEventType;
  title: string;
  message: string;
  entity_type?: "task" | "user" | "leave";
  entity_id?: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string | Date;
  created_at: string | Date;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  unread_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export type NotificationPreferences = Record<NotificationEventType, boolean>;

// Grouped structure used only by the UI to render preference sections
export interface NotificationPreferenceGroup {
  label: string;
  description: string;
  events: {
    key: NotificationEventType;
    label: string;
    description: string;
  }[];
}

export const NOTIFICATION_PREFERENCE_GROUPS: NotificationPreferenceGroup[] = [
  {
    label: "Tasks",
    description: "Notifications about task activity and assignments.",
    events: [
      {
        key: "task_assignment_added",
        label: "Task assigned to you",
        description: "When a task is assigned to you.",
      },
      {
        key: "task_assignment_removed",
        label: "Removed from a task",
        description: "When you are removed from a task.",
      },
      {
        key: "task_reassigned",
        label: "Task reassigned",
        description: "When a task you are on is reassigned.",
      },
      {
        key: "task_status_changed",
        label: "Task status changed",
        description: "When the status of a task changes.",
      },
      {
        key: "task_moved_back",
        label: "Task moved back",
        description: "When a task status is rolled back.",
      },
      {
        key: "task_status_under_review",
        label: "Task under review",
        description: "When a task is submitted for review.",
      },
      {
        key: "task_status_completed",
        label: "Task completed",
        description: "When a task is marked as completed.",
      },
      {
        key: "task_details_updated",
        label: "Task details updated",
        description: "When task details are edited.",
      },
      {
        key: "task_deleted",
        label: "Task deleted",
        description: "When a task you are on is deleted.",
      },
      {
        key: "task_comment_created",
        label: "New comment on task",
        description: "When someone comments on a task you are part of.",
      },
      {
        key: "task_feedback_added",
        label: "Feedback on task",
        description: "When feedback is added to one of your tasks.",
      },
      {
        key: "task_review_required",
        label: "Review required",
        description: "When a task requires your review.",
      },
      {
        key: "task_due_today",
        label: "Task due today",
        description: "Reminder when a task is due today.",
      },
      {
        key: "task_overdue",
        label: "Task overdue",
        description: "Alert when a task is past its due date.",
      },
      {
        key: "task_deliverable_reviewed",
        label: "Deliverable reviewed",
        description: "When a supervisor approves or rejects your deliverable link.",
      },
    ],
  },
  {
    label: "Leaves",
    description: "Notifications about leave requests.",
    events: [
      {
        key: "leave_submitted",
        label: "Leave request submitted",
        description: "When a team member submits a leave request.",
      },
      {
        key: "leave_approved",
        label: "Leave request approved",
        description: "When your leave request is approved.",
      },
      {
        key: "leave_rejected",
        label: "Leave request rejected",
        description: "When your leave request is rejected.",
      },
      {
        key: "leave_cancelled",
        label: "Leave request cancelled",
        description: "When a leave request is cancelled.",
      },
    ],
  },
  {
    label: "Account & Profile",
    description: "Notifications about account and user profile changes.",
    events: [
      {
        key: "user_profile_updated",
        label: "Profile updated",
        description: "When your profile information is changed.",
      },
      {
        key: "user_role_changed",
        label: "Role changed",
        description: "When your role is updated.",
      },
      {
        key: "user_activation_changed",
        label: "Account activation changed",
        description: "When your account is activated or deactivated.",
      },
      {
        key: "user_deleted",
        label: "Account deleted",
        description: "When an account is deleted.",
      },
      {
        key: "intern_profile_updated",
        label: "Internship profile updated",
        description: "When your internship profile is updated.",
      },
    ],
  },
  {
    label: "DTR Reminders",
    description: "Clock-in and clock-out reminders.",
    events: [
      {
        key: "dtr_clock_in_reminder",
        label: "Clock-in reminder",
        description: "Reminder to clock in at the start of your shift.",
      },
      {
        key: "dtr_clock_out_reminder",
        label: "Clock-out reminder",
        description: "Reminder to clock out at the end of your shift.",
      },
    ],
  },
];