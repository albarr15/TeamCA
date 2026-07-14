export type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "Under Review"
  | "Completed";
export type TaskPriority = "Low" | "Medium" | "High";

export interface Task {
  task_id: string | number;
  title: string;
  description: string;
  created_by: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string | Date;
  created_at: string | Date;
  assignees?: string[];
  is_overdue?: boolean;
  is_due_today?: boolean;
}

export interface TaskUserSummary {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface TaskDepartmentSummary {
  department_id: string;
  department_name: string;
}

export interface TaskListItem extends Task {
  assigned_users: TaskUserSummary[];
  comments_count: number;
}

export interface PaginatedTaskListResponse {
  items: TaskListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface TaskAssignment {
  assignment_id: string;
  task_id: string | number;
  assigned_to: string;
  assigned_at: string | Date;
}

export interface TaskStatusHistory {
  history_id: string;
  task_id: string | number;
  updated_by: string;
  updated_by_user: TaskUserSummary | null;
  previous_status: TaskStatus;
  new_status: TaskStatus;
  update_notes?: string;
  timestamp: string | Date;
}

export interface TaskFeedback {
  feedback_id: string;
  task_id: string;
  supervisor_id: string;
  comments: string;
  created_at: string | Date;
}

export type DeliverablePlatform =
  | "github"
  | "figma"
  | "drive"
  | "vercel"
  | "notion"
  | "other";

export type DeliverableStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "revision_requested";

export interface TaskWorkLink {
  work_link_id: string;
  task_id: string;
  submitted_by: string;
  url: string;
  label?: string;
  platform: DeliverablePlatform;
  status: DeliverableStatus;
  review_notes?: string;
  /** ISO-8601 string — set when a supervisor completes a review action. */
  reviewed_at: string | null;
  /** User ID of the supervisor who last reviewed this link. */
  reviewed_by: string | null;
  created_at: string | Date;
}

export interface TaskComment {
  comment_id: string;
  task_id: string;
  user_id: string;
  user: TaskUserSummary | null;
  message: string;
  created_at: string | Date;
}

export interface TaskLinkPermissions {
  can_add_links: boolean;
  can_delete_any_link: boolean;
  can_delete_own_links: boolean;
  can_review_links: boolean;
}

export interface TaskDetail extends Task {
  assigned_users: TaskUserSummary[];
  involved_departments: TaskDepartmentSummary[];
  links: TaskWorkLink[];
  links_count: number;
  history: TaskStatusHistory[];
  comments: TaskComment[];
  link_permissions: TaskLinkPermissions;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority: TaskPriority;
  deadline?: string;
  assigned_to?: string[];
}

export interface UpdateTaskStatusPayload {
  status: TaskStatus;
  update_notes?: string;
}

export interface UpdateTaskStatusResponse {
  task: Task;
  history: TaskStatusHistory;
}

export interface UpdateTaskDetailsPayload {
  title?: string;
  description?: string;
  deadline?: string | null;
}

export interface DeleteTasksPayload {
  task_ids: string[];
}

export interface DeleteTasksResponse {
  deleted_count: number;
  deleted_task_ids: string[];
}

export interface AddTaskFeedbackPayload {
  comments: string;
}

export interface AddTaskWorkLinkPayload {
  url: string;
  label?: string;
}

export interface AddDriveLinkPayload {
  task_id: string;
  url: string;
  label?: string;
}

// A Google Drive deliverable link enriched with the parent task title,
// returned by GET /offboarding/drive-links.
export interface OffboardingDriveLink extends TaskWorkLink {
  task_title: string;
}

export interface ReviewTaskWorkLinkPayload {
  /** Generic task work-link review — only approved/rejected (no revision flow). */
  status: "approved" | "rejected";
  review_notes?: string;
}

// ---------------------------------------------------------------------------
// Supervisor Deliverable Review  (PATCH /offboarding/drive-links/:id/review)
// ---------------------------------------------------------------------------

/** Body sent by a supervisor when reviewing an offboarding Drive deliverable. */
export interface ReviewDriveLinkPayload {
  status: "approved" | "rejected" | "revision_requested";
  /** Required when status is "rejected" or "revision_requested". */
  review_notes?: string;
}

/**
 * Shape returned by PATCH /offboarding/drive-links/:workLinkId/review.
 * Extends TaskWorkLink with the reviewer's full user summary so the frontend
 * can display reviewer details without a second fetch.
 */
export interface ReviewDriveLinkResponse extends TaskWorkLink {
  reviewer: TaskUserSummary;
}

// ---------------------------------------------------------------------------
// Offboarding Drive Links Query  (GET /offboarding/drive-links)
// ---------------------------------------------------------------------------

/** Optional query parameters for the supervisor deliverable list endpoint. */
export interface ListDriveLinksQuery {
  /** Filter results to a single department's submissions. */
  departmentId?: string;
  /** Filter by deliverable review status. */
  status?: DeliverableStatus;
}

export interface AddTaskCommentPayload {
  message: string;
}

export interface CreateTaskResponse {
  task: Task;
  assignments: TaskAssignment[];
}

export interface TaskListQuery {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  created_date?: "all" | "today" | "7d" | "30d";
  sort_by?:
    | "created_desc"
    | "created_asc"
    | "priority_desc"
    | "priority_asc"
    | "deadline_asc"
    | "deadline_desc"
    | "title_asc";
  batch_id?: string;
}

// ---------------------------------------------------------------------------
// Task Analytics  (GET /tasks/analytics)
// ---------------------------------------------------------------------------

export interface CompletionMetrics {
  total:       number;
  completed:   number;
  /** Count of "Not Started" tasks. */
  pending:     number;
  inProgress:  number;
  underReview: number;
  /** deadline < now, excludes "Completed" and "Under Review" statuses. */
  overdue:     number;
}

export interface AssigneePerformance {
  userId:        string;
  name:          string;
  totalAssigned: number;
  completed:     number;
  overdue:       number;
}

export interface TaskAnalyticsResponse {
  completionMetrics:   CompletionMetrics;
  assigneePerformance: AssigneePerformance[];
}

/** Query parameters accepted by GET /tasks/analytics. Dates as ISO-8601 strings. */
export interface TaskAnalyticsParams {
  startDate?: string;
  endDate?:   string;
  status?:    TaskStatus;
}
