import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUserDepartment {
  department_id: Types.ObjectId;
  department_role: "Head" | "Supervisor" | "Intern";
}

export interface INotificationPreferences {
  // Task events
  task_comment_created: boolean;
  task_feedback_added: boolean;
  task_assignment_added: boolean;
  task_assignment_removed: boolean;
  task_reassigned: boolean;
  task_status_changed: boolean;
  task_moved_back: boolean;
  task_status_under_review: boolean;
  task_status_completed: boolean;
  task_details_updated: boolean;
  task_deleted: boolean;
  task_due_today: boolean;
  task_overdue: boolean;
  task_review_required: boolean;
  // User events
  user_profile_updated: boolean;
  user_role_changed: boolean;
  user_activation_changed: boolean;
  user_deleted: boolean;
  intern_profile_updated: boolean;
  // Leave events
  leave_submitted: boolean;
  leave_approved: boolean;
  leave_rejected: boolean;
  leave_cancelled: boolean;
  // DTR reminder events
  dtr_clock_in_reminder: boolean;
  dtr_clock_out_reminder: boolean;
}

export interface IUser extends Document {
  first_name: string;
  last_name: string;
  email: string;
  password_hash?: string;
  global_role: "Superadmin" | "Admin" | "Standard_User";
  departments: IUserDepartment[];
  is_active: boolean;

  working_hours: {
    start: string; // "08:00"
    end: string;   // "17:00"
  };

  working_days: ("M" | "T" | "W" | "Th" | "F" | "Sat" | "Sun")[];

  notification_preferences: INotificationPreferences;

  createdAt: Date;
  updatedAt: Date;
}

const userDepartmentSchema = new Schema<IUserDepartment>(
  {
    department_id: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    department_role: {
      type: String,
      enum: ["Head", "Supervisor", "Intern"],
      required: true,
    },
  },
  { _id: false },
);

// All notifications are opt-in by default (true = enabled)
const notificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    task_comment_created:      { type: Boolean, default: true },
    task_feedback_added:       { type: Boolean, default: true },
    task_assignment_added:     { type: Boolean, default: true },
    task_assignment_removed:   { type: Boolean, default: true },
    task_reassigned:           { type: Boolean, default: true },
    task_status_changed:       { type: Boolean, default: true },
    task_moved_back:           { type: Boolean, default: true },
    task_status_under_review:  { type: Boolean, default: true },
    task_status_completed:     { type: Boolean, default: true },
    task_details_updated:      { type: Boolean, default: true },
    task_deleted:              { type: Boolean, default: true },
    task_due_today:            { type: Boolean, default: true },
    task_overdue:              { type: Boolean, default: true },
    task_review_required:      { type: Boolean, default: true },
    user_profile_updated:      { type: Boolean, default: true },
    user_role_changed:         { type: Boolean, default: true },
    user_activation_changed:   { type: Boolean, default: true },
    user_deleted:              { type: Boolean, default: true },
    intern_profile_updated:    { type: Boolean, default: true },
    leave_submitted:           { type: Boolean, default: true },
    leave_approved:            { type: Boolean, default: true },
    leave_rejected:            { type: Boolean, default: true },
    leave_cancelled:           { type: Boolean, default: true },
    dtr_clock_in_reminder:     { type: Boolean, default: true },
    dtr_clock_out_reminder:    { type: Boolean, default: true },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    first_name: { type: String, default: "" },
    last_name: { type: String, default: "" },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: false },

    global_role: {
      type: String,
      enum: ["Superadmin", "Admin", "Standard_User"],
      default: "Standard_User",
    },

    departments: { type: [userDepartmentSchema], default: [] },
    is_active: { type: Boolean, default: true },

    working_hours: {
      start: { type: String, default: "" }, // "08:00"
      end: { type: String, default: "" },   // "17:00"
    },

    working_days: {
      type: [
        {
          type: String,
          enum: ["M", "T", "W", "Th", "F", "Sat", "Sun"],
        },
      ],
      default: [],
    },

    notification_preferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

export default mongoose.model<IUser>("User", userSchema);