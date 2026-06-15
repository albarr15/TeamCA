// backend/src/schemas/taskSchemas.ts

import { z } from "zod";

// ---------------------------------------------------------------------------
// Create Task  (POST /tasks)
// ---------------------------------------------------------------------------

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(120, "Title must be 120 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or fewer.")
    .optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  deadline: z.coerce
    .date()
    .optional()
    .refine((value) => {
      if (!value) {
        return true;
      }

      const today = new Date();
      const startOfToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ).getTime();
      const startOfDeadline = new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
      ).getTime();
      return startOfDeadline >= startOfToday;
    }, "deadline cannot be in the past."),
  assigned_to: z
    .union([z.string().trim().min(1), z.array(z.string().trim().min(1)).min(1)])
    .optional(),
});

export type CreateTaskPayload = z.infer<typeof createTaskSchema>;

// ---------------------------------------------------------------------------
// Assign Task  (POST /tasks/:taskId/assign)
// ---------------------------------------------------------------------------

export const assignTaskSchema = z.object({
  assigned_to: z.union([
    z.string().trim().min(1),
    z.array(z.string().trim().min(1)).min(1),
  ]),
});

export type AssignTaskPayload = z.infer<typeof assignTaskSchema>;

// ---------------------------------------------------------------------------
// Update Task Status  (PATCH /tasks/:taskId/status)
// ---------------------------------------------------------------------------

export const updateTaskStatusSchema = z.object({
  status: z.enum(["Not Started", "In Progress", "Under Review", "Completed"]),
  update_notes: z
    .string()
    .trim()
    .max(500, "update_notes must be 500 characters or fewer.")
    .optional(),
});

export type UpdateTaskStatusPayload = z.infer<typeof updateTaskStatusSchema>;

// ---------------------------------------------------------------------------
// Add Task Feedback  (POST /tasks/:taskId/feedback)
// ---------------------------------------------------------------------------

export const addTaskFeedbackSchema = z.object({
  comments: z
    .string()
    .trim()
    .min(3, "comments must be at least 3 characters.")
    .max(2000, "comments must be 2000 characters or fewer."),
});

export type AddTaskFeedbackPayload = z.infer<typeof addTaskFeedbackSchema>;

// ---------------------------------------------------------------------------
// Add Task Comment  (POST /tasks/:taskId/comments)
// ---------------------------------------------------------------------------

export const addTaskCommentSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "message is required.")
    .max(2000, "message must be 2000 characters or fewer."),
});

export type AddTaskCommentPayload = z.infer<typeof addTaskCommentSchema>;

// ---------------------------------------------------------------------------
// Update Task Details  (PATCH /tasks/:taskId)
// ---------------------------------------------------------------------------

export const updateTaskDetailsSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required.")
      .max(120, "Title must be 120 characters or fewer.")
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, "Description must be 1000 characters or fewer.")
      .optional(),
    // null is allowed to explicitly clear the deadline
    deadline: z.union([z.coerce.date(), z.null()]).optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.description !== undefined ||
      value.deadline !== undefined,
    { message: "At least one field must be provided." },
  );

export type UpdateTaskDetailsPayload = z.infer<typeof updateTaskDetailsSchema>;

// ---------------------------------------------------------------------------
// Delete Tasks  (DELETE /tasks)
// ---------------------------------------------------------------------------

export const deleteTasksSchema = z.object({
  task_ids: z
    .array(z.string().trim().min(1))
    .min(1, "Select at least one task."),
});

export type DeleteTasksPayload = z.infer<typeof deleteTasksSchema>;

// ---------------------------------------------------------------------------
// Add Task Work Link  (POST /tasks/:taskId/work-links)
// ---------------------------------------------------------------------------

export const addTaskWorkLinkSchema = z.object({
  url: z.string().trim().url("url must be a valid URL."),
  label: z
    .string()
    .trim()
    .max(120, "label must be 120 characters or fewer.")
    .optional(),
});

export type AddTaskWorkLinkPayload = z.infer<typeof addTaskWorkLinkSchema>;

// ---------------------------------------------------------------------------
// Review Task Work Link  (PATCH /tasks/:taskId/work-links/:workLinkId/review)
// ---------------------------------------------------------------------------

export const reviewTaskWorkLinkSchema = z
  .object({
    status: z.enum(["approved", "rejected"]),
    review_notes: z
      .string()
      .trim()
      .max(1000, "review_notes must be 1000 characters or fewer.")
      .optional(),
  })
  .refine(
    (val) =>
      val.status !== "rejected" || (val.review_notes?.trim().length ?? 0) > 0,
    { message: "review_notes is required when rejecting a deliverable." },
  );

export type ReviewTaskWorkLinkPayload = z.infer<typeof reviewTaskWorkLinkSchema>;

// ---------------------------------------------------------------------------
// List Tasks Query  (GET /tasks)
// ---------------------------------------------------------------------------

/**
 * `paginate` is included so the middleware preserves it when it replaces
 * req.query with the Zod-parsed output. The controller reads it to decide
 * whether to return a paginated or flat list.
 */
export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z
    .enum(["Not Started", "In Progress", "Under Review", "Completed"])
    .optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  search: z.string().trim().max(200).optional(),
  created_date: z.enum(["all", "today", "7d", "30d"]).default("all"),
  sort_by: z
    .enum([
      "created_desc",
      "created_asc",
      "priority_desc",
      "priority_asc",
      "deadline_asc",
      "deadline_desc",
      "title_asc",
    ])
    .default("created_desc"),
  batch_id: z.string().trim().min(1).optional(),
  paginate: z.string().optional(),
});

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
