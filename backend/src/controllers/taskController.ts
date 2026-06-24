import type { Request, Response } from "express";
import {
  type CreateTaskPayload,
  type AssignTaskPayload,
  type UpdateTaskStatusPayload,
  type UpdateTaskDetailsPayload,
  type DeleteTasksPayload,
  type AddTaskFeedbackPayload,
  type AddTaskCommentPayload,
  type AddTaskWorkLinkPayload,
  type ReviewTaskWorkLinkPayload,
  type ListTasksQuery,
  type TaskAnalyticsQuery,
} from "../schemas/taskSchemas.js";
import Notification from "../models/Notification.js";
import {
  addTaskComment,
  addTaskFeedback,
  addTaskWorkLink,
  assignTask,
  createTaskWithAssignment,
  deleteTasks,
  deleteTaskWorkLink,
  getTaskDetail,
  listAccessibleTasks,
  listAccessibleTasksPaginated,
  listTaskComments,
  listTaskFeedback,
  listTaskStatusHistory,
  listTaskWorkLinks,
  reviewTaskWorkLink,
  updateTaskDetails,
  updateTaskStatus,
} from "../services/taskService.js";
import Task from "../models/Task.js";
import TaskAssignment from "../models/TaskAssignment.js";
import User from "../models/User.js";
import { createNotificationsForRecipients } from "../services/notificationService.js";
import {
  emitDeadlineNotificationsForTask,
} from "../services/deadlineService.js";
import {
  emitTaskCommentCreated,
  emitTaskStatusUpdated,
  emitUsersNotification,
} from "../socket/io.js";
import { getUserIdsInBatch } from "../services/batchService.js";
import {
  compactActivityChanges,
  logActivityForRequest,
  optionalActivityText,
  safeActivityText,
} from "../utils/activityLogPayload.js";


const parseTaskId = (req: Request, res: Response): string | null => {
  const rawTaskId = req.params.taskId;
  const taskId = Array.isArray(rawTaskId) ? rawTaskId[0] : rawTaskId;
  if (!taskId) {
    res.status(400).json({ message: "taskId is required." });
    return null;
  }

  return taskId;
};

const getTaskParticipantIds = async (taskId: string): Promise<string[]> => {
  const [task, assignments] = await Promise.all([
    Task.findById(taskId).select("created_by").lean(),
    TaskAssignment.find({ task_id: taskId }).select("assigned_to").lean(),
  ]);

  if (!task) {
    return [];
  }

  const ids = [
    String(task.created_by),
    ...assignments.map((item) => String(item.assigned_to)),
  ];

  return [...new Set(ids)];
};

const getTaskAssigneeIds = async (taskId: string): Promise<string[]> => {
  const assignments = await TaskAssignment.find({ task_id: taskId })
    .select("assigned_to")
    .lean();
  return [...new Set(assignments.map((item) => String(item.assigned_to)))];
};

const getTaskDeleteContexts = async (taskIds: string[]) => {
  const normalizedTaskIds = [
    ...new Set(
      taskIds
        .map((taskId) => taskId.trim())
        .filter((taskId) => taskId.length > 0),
    ),
  ];
  if (normalizedTaskIds.length === 0) {
    return [] as Array<{
      task_id: string;
      title: string;
      status: string;
      recipient_ids: string[];
    }>;
  }

  const [tasks, assignments] = await Promise.all([
    Task.find({ _id: { $in: normalizedTaskIds } })
      .select("_id title status created_by")
      .lean(),
    TaskAssignment.find({ task_id: { $in: normalizedTaskIds } })
      .select("task_id assigned_to")
      .lean(),
  ]);

  return tasks.map((task) => {
    const taskId = String(task._id);
    const assigneeIds = assignments
      .filter((assignment) => String(assignment.task_id) === taskId)
      .map((assignment) => String(assignment.assigned_to));

    const recipientIds = [
      ...new Set([String(task.created_by), ...assigneeIds]),
    ];

    return {
      task_id: taskId,
      title: task.title,
      status: task.status,
      recipient_ids: recipientIds,
    };
  });
};

const getUserFirstNameById = async (userId: string): Promise<string> => {
  const user = await User.findById(userId).select("first_name").lean();
  const firstName = user?.first_name?.trim();
  return firstName && firstName.length > 0 ? firstName : "Someone";
};

const getDepartmentReviewerIdsForTask = async (
  taskId: string,
): Promise<string[]> => {
  const participantIds = await getTaskParticipantIds(taskId);
  if (participantIds.length === 0) {
    return [];
  }

  const participantUsers = await User.find({ _id: { $in: participantIds } })
    .select("departments")
    .lean();

  const departmentIds = [
    ...new Set(
      participantUsers.flatMap((user) =>
        (user.departments ?? []).map((department) =>
          String(department.department_id),
        ),
      ),
    ),
  ];

  if (departmentIds.length === 0) {
    return [];
  }

  const reviewers = await User.find({
    is_active: true,
    departments: {
      $elemMatch: {
        department_id: { $in: departmentIds },
        department_role: { $in: ["Head", "Supervisor"] },
      },
    },
  })
    .select("_id")
    .lean();

  return [...new Set(reviewers.map((item) => String(item._id)))];
};

export const createTaskHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // req.body is guaranteed to be a valid CreateTaskPayload by validateRequest middleware
    const payload = req.body as CreateTaskPayload;
    const normalizedAssignees = Array.isArray(payload.assigned_to)
      ? payload.assigned_to
      : payload.assigned_to
        ? [payload.assigned_to]
        : undefined;

    const normalizedPayload = {
      ...payload,
      assigned_to: normalizedAssignees,
    };

    const created = await createTaskWithAssignment(req.user, normalizedPayload);

    const actorId = String(req.user.user_id);
    const actorFirstName = await getUserFirstNameById(actorId);
    await emitDeadlineNotificationsForTask(
      created.task,
      actorId,
      actorFirstName,
    );

    const assigneeIds = [
      ...new Set(
        created.assignments
          .map((a) => String(a.assigned_to))
          .filter((id) => id && id !== actorId),
      ),
    ];

    if (assigneeIds.length > 0) {
      const notifications = await createNotificationsForRecipients(
        assigneeIds,
        {
          actorId,
          eventType: "task_assignment_added",
          title: "You were assigned a task",
          message: `You were assigned to "${created.task.title}".`,
          entityType: "task",
          entityId: String(created.task.task_id),
          metadata: {
            task_id: String(created.task.task_id),
            assignment_change: "added",
            task_title: created.task.title,
            task_status: created.task.status,
          },
        },
      );

      for (const notification of notifications) {
        emitUsersNotification([notification.recipient_id], notification);
      }
    }

    return res.status(201).json(created);
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes("Department managers") ||
        error.message.includes("Standard users") ||
        error.message.includes("Interns")
      ) {
        return res.status(403).json({ message: error.message });
      }

      if (
        error.message.includes("inactive") ||
        error.message.includes("does not exist")
      ) {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes("At least one assignee")) {
        return res.status(400).json({ message: error.message });
      }

      if (error.message.includes("must include your own user")) {
        return res.status(400).json({ message: error.message });
      }
    }

    return res.status(500).json({ message: "Failed to create task." });
  }
};

export const assignTaskHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const taskId = parseTaskId(req, res);
    if (!taskId) {
      return;
    }

    // req.body is guaranteed to be a valid AssignTaskPayload by validateRequest middleware
    const payload = req.body as AssignTaskPayload;
    const assignees = Array.isArray(payload.assigned_to)
      ? payload.assigned_to
      : [payload.assigned_to];

    const [task, previousAssignments] = await Promise.all([
      Task.findById(taskId).select("title status").lean(),
      TaskAssignment.find({ task_id: taskId }).select("assigned_to").lean(),
    ]);

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const previousAssigneeIds = [
      ...new Set(previousAssignments.map((item) => String(item.assigned_to))),
    ];

    const assignment = await assignTask(req.user, {
      taskId,
      assignedToUserIds: assignees,
    });

    const currentAssigneeIds = [
      ...new Set(assignment.map((item) => item.assigned_to)),
    ];
    const addedAssigneeIds = currentAssigneeIds.filter(
      (id) => !previousAssigneeIds.includes(id),
    );
    const removedAssigneeIds = previousAssigneeIds.filter(
      (id) => !currentAssigneeIds.includes(id),
    );
    const actorId = String(req.user.user_id);
    const taskTitle = safeActivityText(task.title, taskId);

    await logActivityForRequest(req, {
      action_type: "update",
      resource_type: "task",
      resource_id: taskId,
      description: `Task assignment updated: ${taskTitle}`,
      changes: compactActivityChanges({
        task_id: taskId,
        task_title: taskTitle,
        task_status: safeActivityText(task.status, "Unknown Status"),
        old_assigned_user_ids: previousAssigneeIds,
        new_assigned_user_ids: currentAssigneeIds,
        added_assigned_user_ids: addedAssigneeIds,
        removed_assigned_user_ids: removedAssigneeIds,
        assigned_user_ids: currentAssigneeIds,
        performed_by_user_id: actorId,
        performed_by_email: optionalActivityText(req.user?.email),
      }),
    });

    if (addedAssigneeIds.length > 0) {
      const notifications = await createNotificationsForRecipients(
        addedAssigneeIds,
        {
          actorId,
          eventType: "task_assignment_added",
          title: "You were assigned a task",
          message: `You were added to "${task.title}".`,
          entityType: "task",
          entityId: taskId,
          metadata: {
            task_id: taskId,
            assignment_change: "added",
            task_title: task.title,
            task_status: task.status,
          },
        },
      );

      for (const notification of notifications) {
        emitUsersNotification([notification.recipient_id], notification);
      }
    }

    if (removedAssigneeIds.length > 0) {
      const removedNotifications = await createNotificationsForRecipients(
        removedAssigneeIds,
        {
          actorId,
          eventType: "task_assignment_removed",
          title: "You were unassigned from a task",
          message: `You were removed from "${task.title}".`,
          entityType: "task",
          entityId: taskId,
          metadata: {
            task_id: taskId,
            assignment_change: "removed",
            task_title: task.title,
            task_status: task.status,
          },
        },
      );

      for (const notification of removedNotifications) {
        emitUsersNotification([notification.recipient_id], notification);
      }

      const remainingNotifications = await createNotificationsForRecipients(
        currentAssigneeIds,
        {
          actorId,
          eventType: "task_reassigned",
          title: "Task assignees were updated",
          message: `Assignees were updated for "${task.title}".`,
          entityType: "task",
          entityId: taskId,
          metadata: {
            task_id: taskId,
            assignment_change: "reassigned",
            removed_count: removedAssigneeIds.length,
            task_title: task.title,
            task_status: task.status,
          },
        },
      );

      for (const notification of remainingNotifications) {
        emitUsersNotification([notification.recipient_id], notification);
      }
    }

    return res.status(200).json(assignment);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Task not found.") {
        return res.status(404).json({ message: error.message });
      }

      if (
        error.message.includes("Department managers") ||
        error.message.includes("Standard users") ||
        error.message.includes("Interns")
      ) {
        return res.status(403).json({ message: error.message });
      }

      if (
        error.message.includes("inactive") ||
        error.message.includes("does not exist")
      ) {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes("At least one assignee")) {
        return res.status(400).json({ message: error.message });
      }

      if (error.message.includes("must include your own user")) {
        return res.status(400).json({ message: error.message });
      }
    }

    return res.status(500).json({ message: "Failed to assign task." });
  }
};

export const listTasksHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // req.query is guaranteed to be a valid ListTasksQuery by validateRequest middleware
    const query = req.query as unknown as ListTasksQuery;

    if (query.paginate === "false") {
      const tasks = await listAccessibleTasks(req.user);
      for (const task of tasks) {
        await emitDeadlineNotificationsForTask(task);
      }
      return res.status(200).json(tasks);
    }

    const batchUserIds = query.batch_id
      ? await getUserIdsInBatch(query.batch_id)
      : undefined;

    const payload = await listAccessibleTasksPaginated(req.user, {
      page: query.page,
      limit: query.limit,
      status: query.status,
      priority: query.priority,
      search: query.search,
      createdDate: query.created_date,
      sortBy: query.sort_by,
      batchUserIds,
    });

    for (const task of payload.items) {
      await emitDeadlineNotificationsForTask(task);
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ message: "Failed to list tasks." });
  }
};

export const getTaskDetailHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const taskId = parseTaskId(req, res);
    if (!taskId) {
      return;
    }

    const task = await getTaskDetail(req.user, taskId);
    return res.status(200).json(task);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Task not found.") {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes("do not have permission")) {
        return res.status(403).json({ message: error.message });
      }
    }

    return res.status(500).json({ message: "Failed to fetch task details." });
  }
};

export const updateTaskStatusHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const taskId = parseTaskId(req, res);
    if (!taskId) {
      return;
    }

    // req.body is guaranteed to be a valid UpdateTaskStatusPayload by validateRequest middleware
    const payload = req.body as UpdateTaskStatusPayload;

    // Layer 1 guard: fetch current status before the update to short-circuit
    // duplicate calls that arrive before the DB write is visible. This prevents
    // the notification pipeline from firing when the status hasn't actually changed.
    const existingTask = await Task.findById(taskId)
      .select("status")
      .lean();
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found." });
    }
    if (existingTask.status === payload.status) {
      return res
        .status(400)
        .json({ message: "Task is already in the requested status." });
    }

    const updated = await updateTaskStatus(req.user, {
      taskId,
      newStatus: payload.status,
      updateNotes: payload.update_notes,
    });

    emitTaskStatusUpdated(taskId, {
      task_id: taskId,
      task: updated.task,
      history: updated.history,
    });

    const actorId = String(req.user.user_id);
    const actorFirstName = await getUserFirstNameById(actorId);
    const assigneeIds = await getTaskAssigneeIds(taskId);
    const previousStatus = updated.history.previous_status;
    const newStatus = payload.status;
    const taskTitle = safeActivityText(updated.task.title, taskId);

    await logActivityForRequest(req, {
      action_type: "update",
      resource_type: "task",
      resource_id: taskId,
      description: `Task status changed: ${previousStatus} -> ${newStatus}`,
      changes: compactActivityChanges({
        task_id: taskId,
        task_title: taskTitle,
        old_status: previousStatus,
        new_status: newStatus,
        assigned_user_ids: assigneeIds,
        performed_by_user_id: actorId,
        performed_by_email: optionalActivityText(req.user?.email),
      }),
    });

    const statusNotifications = await createNotificationsForRecipients(
      assigneeIds,
      {
        actorId,
        eventType: "task_status_changed",
        title: "Task status updated",
        message: `${actorFirstName} changed status of "${updated.task.title}" to ${payload.status}.`,
        entityType: "task",
        entityId: taskId,
        metadata: {
          task_id: taskId,
          previous_status: updated.history.previous_status,
          new_status: payload.status,
          actor_first_name: actorFirstName,
          task_title: updated.task.title,
          task_status: payload.status,
        },
      },
    );

    for (const notification of statusNotifications) {
      emitUsersNotification([notification.recipient_id], notification);
    }

    if (
      updated.history.previous_status === "Under Review" &&
      payload.status === "In Progress"
    ) {
      const reviewerIds = await getDepartmentReviewerIdsForTask(taskId);
      const movedBackRecipients = [
        ...new Set([...assigneeIds, ...reviewerIds]),
      ];

      const movedBackNotifications = await createNotificationsForRecipients(
        movedBackRecipients,
        {
          actorId,
          eventType: "task_moved_back",
          title: "Task was sent back",
          message: `${actorFirstName} moved "${updated.task.title}" back from Under Review to In Progress.`,
          entityType: "task",
          entityId: taskId,
          metadata: {
            task_id: taskId,
            previous_status: updated.history.previous_status,
            new_status: payload.status,
            actor_first_name: actorFirstName,
            task_title: updated.task.title,
            task_status: payload.status,
          },
        },
      );

      for (const notification of movedBackNotifications) {
        emitUsersNotification([notification.recipient_id], notification);
      }
    }

    if (payload.status === "Under Review") {
      // Two separate notification batches so reviewers get an actionable message
      // while assignees/creator get a status-update message.
      const [participantIds, reviewerIds] = await Promise.all([
        getTaskParticipantIds(taskId),
        getDepartmentReviewerIdsForTask(taskId),
      ]);

      // Reviewers who are NOT already participants get the approval-request message.
      const reviewerOnlyIds = reviewerIds.filter(
        (id) => !participantIds.includes(id),
      );

      // Participants (assignees + creator) — "your task is under review"
      if (participantIds.length > 0) {
        const participantNotifications = await createNotificationsForRecipients(
          participantIds,
          {
            actorId,
            eventType: "task_status_under_review",
            title: "Task sent for review",
            message: `${actorFirstName} submitted "${updated.task.title}" for review.`,
            entityType: "task",
            entityId: taskId,
            metadata: {
              task_id: taskId,
              new_status: payload.status,
              actor_first_name: actorFirstName,
              task_title: updated.task.title,
              task_status: payload.status,
            },
          },
        );

        for (const notification of participantNotifications) {
          emitUsersNotification([notification.recipient_id], notification);
        }
      }

      // Reviewers outside the participant list — "needs your approval"
      if (reviewerOnlyIds.length > 0) {
        const reviewerNotifications = await createNotificationsForRecipients(
          reviewerOnlyIds,
          {
            actorId,
            eventType: "task_review_required",
            title: "Task needs your approval",
            message: `"${updated.task.title}" has been submitted for review and requires your approval.`,
            entityType: "task",
            entityId: taskId,
            metadata: {
              task_id: taskId,
              new_status: payload.status,
              actor_first_name: actorFirstName,
              task_title: updated.task.title,
              task_status: payload.status,
            },
          },
        );

        for (const notification of reviewerNotifications) {
          emitUsersNotification([notification.recipient_id], notification);
        }
      }
    }

    if (payload.status === "Completed") {
      const [participantIds, reviewerIds] = await Promise.all([
        getTaskParticipantIds(taskId),
        getDepartmentReviewerIdsForTask(taskId),
      ]);
      const completedRecipientIds = [
        ...new Set([...participantIds, ...reviewerIds]),
      ];

      const completedNotifications = await createNotificationsForRecipients(
        completedRecipientIds,
        {
          actorId,
          eventType: "task_status_completed",
          title: "Task completed",
          message: `${actorFirstName} approved and completed "${updated.task.title}".`,
          entityType: "task",
          entityId: taskId,
          metadata: {
            task_id: taskId,
            new_status: payload.status,
            actor_first_name: actorFirstName,
            task_title: updated.task.title,
            task_status: payload.status,
          },
        },
      );

      for (const notification of completedNotifications) {
        emitUsersNotification([notification.recipient_id], notification);
      }
    }

    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Task not found.") {
        return res.status(404).json({ message: error.message });
      }

      if (
        error.message.includes("Invalid status transition") ||
        error.message.includes("already in the requested status") ||
        error.message.includes("are locked") ||
        error.message.includes("Attach at least one work link") ||
        error.message.includes("All deliverable links must be approved")
      ) {
        return res.status(400).json({ message: error.message });
      }

      if (error.message.includes("do not have permission")) {
        return res.status(403).json({ message: error.message });
      }
    }

    return res.status(500).json({ message: "Failed to update task status." });
  }
};

export const updateTaskDetailsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const taskId = parseTaskId(req, res);
    if (!taskId) {
      return;
    }

    // req.body is guaranteed to be a valid UpdateTaskDetailsPayload by validateRequest middleware
    const payload = req.body as UpdateTaskDetailsPayload;
    if (payload.deadline && payload.deadline.getTime() < Date.now()) {
      return res
        .status(400)
        .json({ message: "Deadline cannot be in the past." });
    }

    const existingTask = await Task.findById(taskId)
      .select("title description deadline status")
      .lean();

    if (!existingTask) {
      return res.status(404).json({ message: "Task not found." });
    }

    const updatedTask = await updateTaskDetails(req.user, {
      taskId,
      title: payload.title,
      description: payload.description,
      deadline: payload.deadline,
    });

    const actorId = String(req.user.user_id);
    const actorFirstName = await getUserFirstNameById(actorId);
    await emitDeadlineNotificationsForTask(
      updatedTask,
      actorId,
      actorFirstName,
    );

    const changedFields: string[] = [];
    if (existingTask.title !== updatedTask.title) {
      changedFields.push("title");
    }

    const previousDescription = (existingTask.description || "").trim();
    const nextDescription = (updatedTask.description || "").trim();
    if (previousDescription !== nextDescription) {
      changedFields.push("description");
    }

    const previousDeadline = existingTask.deadline
      ? new Date(existingTask.deadline).getTime()
      : null;
    const nextDeadline = updatedTask.deadline
      ? new Date(updatedTask.deadline).getTime()
      : null;
    if (previousDeadline !== nextDeadline) {
      changedFields.push("deadline");
    }

    if (changedFields.length > 0) {
      const [participantIds, reviewerIds] = await Promise.all([
        getTaskParticipantIds(taskId),
        getDepartmentReviewerIdsForTask(taskId),
      ]);

      const notifications = await createNotificationsForRecipients(
        [...new Set([...participantIds, ...reviewerIds])],
        {
          actorId,
          eventType: "task_details_updated",
          title: "Task details updated",
          message: `${actorFirstName} updated ${changedFields.join(", ")} for "${updatedTask.title}".`,
          entityType: "task",
          entityId: taskId,
          metadata: {
            task_id: taskId,
            task_title: updatedTask.title,
            changed_fields: changedFields,
            actor_first_name: actorFirstName,
          },
        },
      );

      for (const notification of notifications) {
        emitUsersNotification([notification.recipient_id], notification);
      }
    }

    return res.status(200).json(updatedTask);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Task not found.") {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes("Task details are locked")) {
        return res.status(400).json({ message: error.message });
      }

      if (error.message.includes("do not have permission")) {
        return res.status(403).json({ message: error.message });
      }
    }

    return res.status(500).json({ message: "Failed to update task details." });
  }
};

export const deleteTasksHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // req.body is guaranteed to be a valid DeleteTasksPayload by validateRequest middleware
    const payload = req.body as DeleteTasksPayload;
    const contexts = await getTaskDeleteContexts(payload.task_ids);

    const result = await deleteTasks(req.user, {
      taskIds: payload.task_ids,
    });

    const actorId = String(req.user.user_id);
    const actorFirstName = await getUserFirstNameById(actorId);

    for (const deletedTaskId of result.deleted_task_ids) {
      const context = contexts.find((item) => item.task_id === deletedTaskId);
      if (!context) {
        continue;
      }

      const notifications = await createNotificationsForRecipients(
        context.recipient_ids,
        {
          actorId,
          eventType: "task_deleted",
          title: "Task deleted",
          message: `${actorFirstName} deleted "${context.title}".`,
          entityType: "task",
          entityId: deletedTaskId,
          metadata: {
            task_id: deletedTaskId,
            task_title: context.title,
            task_status: context.status,
            actor_first_name: actorFirstName,
          },
        },
      );

      for (const notification of notifications) {
        emitUsersNotification([notification.recipient_id], notification);
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Task not found.") {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes("do not have permission")) {
        return res.status(403).json({ message: error.message });
      }
    }

    return res.status(500).json({ message: "Failed to delete tasks." });
  }
};

export const addTaskFeedbackHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const taskId = parseTaskId(req, res);
    if (!taskId) {
      return;
    }

    // req.body is guaranteed to be a valid AddTaskFeedbackPayload by validateRequest middleware
    const payload = req.body as AddTaskFeedbackPayload;
    const feedback = await addTaskFeedback(req.user, {
      taskId,
      comments: payload.comments,
    });

    const [task, assigneeIds] = await Promise.all([
      Task.findById(taskId).select("title created_by").lean(),
      getTaskAssigneeIds(taskId),
    ]);

    if (task) {
      const recipientIds = [...assigneeIds];
      const creatorId = String(task.created_by);
      if (!recipientIds.includes(creatorId)) {
        recipientIds.push(creatorId);
      }

      const notifications = await createNotificationsForRecipients(
        recipientIds,
        {
          actorId: String(req.user.user_id),
          eventType: "task_feedback_added",
          title: "New task feedback",
          message: `Kindly check the feedback sent to ${task.title}.`,
          entityType: "task",
          entityId: taskId,
          metadata: {
            task_id: taskId,
            feedback_id: feedback.feedback_id,
          },
        },
      );

      for (const notification of notifications) {
        emitUsersNotification([notification.recipient_id], notification);
      }
    }

    return res.status(201).json(feedback);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Task not found.") {
        return res.status(404).json({ message: error.message });
      }

      if (
        error.message.includes("Only supervisors") ||
        error.message.includes("do not have permission")
      ) {
        return res.status(403).json({ message: error.message });
      }
    }

    return res.status(500).json({ message: "Failed to submit task feedback." });
  }
};

export const listTaskFeedbackHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const taskId = parseTaskId(req, res);
    if (!taskId) {
      return;
    }

    const feedback = await listTaskFeedback(req.user, taskId);
    return res.status(200).json(feedback);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Task not found.") {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes("do not have permission")) {
        return res.status(403).json({ message: error.message });
      }
    }

    return res.status(500).json({ message: "Failed to load task feedback." });
  }
};

export const listTaskStatusHistoryHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const taskId = parseTaskId(req, res);
    if (!taskId) {
      return;
    }

    const history = await listTaskStatusHistory(req.user, taskId);
    return res.status(200).json(history);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Task not found.") {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes("do not have permission")) {
        return res.status(403).json({ message: error.message });
      }
    }

    return res
      .status(500)
      .json({ message: "Failed to load task status history." });
  }
};

export const addTaskWorkLinkHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const taskId = parseTaskId(req, res);
    if (!taskId) {
      return;
    }

    // req.body is guaranteed to be a valid AddTaskWorkLinkPayload by validateRequest middleware
    const payload = req.body as AddTaskWorkLinkPayload;
    const workLink = await addTaskWorkLink(req.user, {
      taskId,
      url: payload.url,
      label: payload.label,
    });

    return res.status(201).json(workLink);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Task not found.") {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes("before the task enters review")) {
        return res.status(400).json({ message: error.message });
      }

      if (error.message.includes("do not have permission")) {
        return res.status(403).json({ message: error.message });
      }
    }

    return res.status(500).json({ message: "Failed to add task work link." });
  }
};

export const listTaskWorkLinksHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const taskId = parseTaskId(req, res);
    if (!taskId) {
      return;
    }

    const workLinks = await listTaskWorkLinks(req.user, taskId);
    return res.status(200).json(workLinks);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Task not found.") {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes("do not have permission")) {
        return res.status(403).json({ message: error.message });
      }
    }

    return res.status(500).json({ message: "Failed to load task work links." });
  }
};

export const reviewTaskWorkLinkHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const taskId = parseTaskId(req, res);
    if (!taskId) {
      return;
    }

    const rawWorkLinkId = req.params.workLinkId;
    const workLinkId = Array.isArray(rawWorkLinkId)
      ? rawWorkLinkId[0]
      : rawWorkLinkId;
    if (!workLinkId) {
      return res.status(400).json({ message: "workLinkId is required." });
    }

    // req.body is guaranteed to be a valid ReviewTaskWorkLinkPayload by validateRequest middleware
    const payload = req.body as ReviewTaskWorkLinkPayload;
    const reviewed = await reviewTaskWorkLink(req.user, {
      taskId,
      workLinkId,
      status: payload.status,
      review_notes: payload.review_notes,
    });

    // Notify the intern who submitted the deliverable
    const actorId = String(req.user.user_id);
    const submitterId = reviewed.submitted_by;
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
          payload.status === "approved" ? "approved" : "rejected";
        const notifications = await createNotificationsForRecipients(
          [submitterId],
          {
            actorId,
            eventType: "task_deliverable_reviewed",
            title: `Deliverable ${statusLabel}`,
            message: `${actorName} ${statusLabel} your deliverable link for "${task.title}".`,
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
        error.message.includes("review_notes is required") ||
        error.message.includes("All deliverable links")
      ) {
        return res.status(400).json({ message: error.message });
      }

      if (
        error.message.includes("do not have permission") ||
        error.message.includes("Only Supervisors")
      ) {
        return res.status(403).json({ message: error.message });
      }
    }

    return res
      .status(500)
      .json({ message: "Failed to review task work link." });
  }
};

export const deleteTaskWorkLinkHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const taskId = parseTaskId(req, res);
    if (!taskId) {
      return;
    }

    const rawWorkLinkId = req.params.workLinkId;
    const workLinkId = Array.isArray(rawWorkLinkId)
      ? rawWorkLinkId[0]
      : rawWorkLinkId;
    if (!workLinkId) {
      return res.status(400).json({ message: "workLinkId is required." });
    }

    const removed = await deleteTaskWorkLink(req.user, { taskId, workLinkId });
    return res.status(200).json(removed);
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Task not found." ||
        error.message === "Work link not found."
      ) {
        return res.status(404).json({ message: error.message });
      }

      if (
        error.message.includes("before the task enters review") ||
        error.message.includes("only remove your own work links")
      ) {
        return res.status(400).json({ message: error.message });
      }

      if (error.message.includes("do not have permission")) {
        return res.status(403).json({ message: error.message });
      }
    }

    return res
      .status(500)
      .json({ message: "Failed to remove task work link." });
  }
};

export const listTaskCommentsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const taskId = parseTaskId(req, res);
    if (!taskId) {
      return;
    }

    const comments = await listTaskComments(req.user, taskId);
    return res.status(200).json(comments);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Task not found.") {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes("do not have permission")) {
        return res.status(403).json({ message: error.message });
      }
    }

    return res.status(500).json({ message: "Failed to load task comments." });
  }
};

export const addTaskCommentHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const taskId = parseTaskId(req, res);
    if (!taskId) {
      return;
    }

    // req.body is guaranteed to be a valid AddTaskCommentPayload by validateRequest middleware
    const payload = req.body as AddTaskCommentPayload;
    const comment = await addTaskComment(req.user, {
      taskId,
      message: payload.message,
    });

    emitTaskCommentCreated(taskId, {
      task_id: taskId,
      comment,
    });

    const [task, assigneeIds] = await Promise.all([
      Task.findById(taskId).select("title created_by").lean(),
      getTaskAssigneeIds(taskId),
    ]);

    const taskTitle = task?.title || `task ${taskId}`;
    const recipientIds = [
      ...new Set([
        ...assigneeIds,
        ...(task?.created_by ? [String(task.created_by)] : []),
      ]),
    ];

    const notifications = await createNotificationsForRecipients(recipientIds, {
      actorId: String(req.user.user_id),
      eventType: "task_comment_created",
      title: "New task comment",
      message: `${comment.user?.first_name || "A user"} commented on ${taskTitle}.`,
      entityType: "task",
      entityId: taskId,
      metadata: {
        task_id: taskId,
        comment_id: comment.comment_id,
      },
    });

    for (const notification of notifications) {
      emitUsersNotification([notification.recipient_id], notification);
    }

    return res.status(201).json(comment);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Task not found.") {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes("do not have permission")) {
        return res.status(403).json({ message: error.message });
      }
    }

    return res.status(500).json({ message: "Failed to add task comment." });
  }
};

// ---------------------------------------------------------------------------
// GET /tasks/analytics  (admin-only)
// ---------------------------------------------------------------------------

export const getTaskAnalyticsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // req.query is guaranteed to be a valid TaskAnalyticsQuery by validateRequest middleware
    const query = req.query as unknown as TaskAnalyticsQuery;
    const now = new Date();

    // Build a $match filter scoped to the deadline field.
    // The status filter (if provided) is also applied here so both pipelines
    // use the exact same base match without duplication.
    const baseMatch: Record<string, unknown> = {};

    if (query.startDate || query.endDate) {
      const deadlineRange: Record<string, Date> = {};
      if (query.startDate) deadlineRange.$gte = query.startDate;
      if (query.endDate)   deadlineRange.$lte = query.endDate;
      baseMatch.deadline = deadlineRange;
    }

    if (query.status) {
      baseMatch.status = query.status;
    }

    // -----------------------------------------------------------------------
    // Pipeline A — Completion Metrics
    // A single $facet pass so MongoDB reads the collection once and branches
    // into parallel $count sub-pipelines — no N+1 countDocuments calls.
    //
    // Overdue: deadline < now AND status is not "Completed" or "Under Review".
    // Tasks in "Under Review" are excluded because the assignee has already
    // done their part; the delay is on the reviewer side.
    // -----------------------------------------------------------------------
    const [metrics] = await Task.aggregate([
      { $match: baseMatch },
      {
        $facet: {
          total:       [{ $count: "count" }],
          completed:   [{ $match: { status: "Completed"    } }, { $count: "count" }],
          pending:     [{ $match: { status: "Not Started"  } }, { $count: "count" }],
          inProgress:  [{ $match: { status: "In Progress"  } }, { $count: "count" }],
          underReview: [{ $match: { status: "Under Review" } }, { $count: "count" }],
          overdue: [
            {
              $match: {
                deadline: { $lt: now },
                status: { $nin: ["Completed", "Under Review"] },
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]);

    // -----------------------------------------------------------------------
    // Pipeline B — Assignee Performance
    // Start from TaskAssignment and $lookup tasks with a sub-pipeline so the
    // date-range / status filter is pushed into the join — only matching tasks
    // are materialised, keeping memory usage proportional to the result set.
    // A second $lookup hydrates user names in the same aggregation pass.
    // -----------------------------------------------------------------------
    const assigneePerformance = await TaskAssignment.aggregate([
      {
        $lookup: {
          from: "tasks",
          let:  { taskId: "$task_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$taskId"] },
                ...baseMatch,
              },
            },
            { $project: { status: 1, deadline: 1 } },
          ],
          as: "task",
        },
      },
      // Drop assignment rows whose joined task didn't pass the filter
      { $unwind: "$task" },
      {
        $group: {
          _id:           "$assigned_to",
          totalAssigned: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ["$task.status", "Completed"] }, 1, 0],
            },
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: [{ $ifNull: ["$task.deadline", null] }, null] },
                    { $lt: ["$task.deadline", now] },
                    { $not: [{ $in: ["$task.status", ["Completed", "Under Review"]] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from:         "users",
          localField:   "_id",
          foreignField: "_id",
          as:           "user",
        },
      },
      // preserveNullAndEmpty keeps orphaned assignments (e.g. deleted users)
      // so their counts aren't silently dropped from the totals.
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id:           0,
          userId:        { $toString: "$_id" },
          name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$user.first_name", ""] },
                  " ",
                  { $ifNull: ["$user.last_name",  ""] },
                ],
              },
            },
          },
          totalAssigned: 1,
          completed:     1,
          overdue:       1,
        },
      },
      { $sort: { totalAssigned: -1 } },
    ]);

    return res.status(200).json({
      completionMetrics: {
        total:       metrics?.total[0]?.count       ?? 0,
        completed:   metrics?.completed[0]?.count   ?? 0,
        pending:     metrics?.pending[0]?.count     ?? 0,
        inProgress:  metrics?.inProgress[0]?.count  ?? 0,
        underReview: metrics?.underReview[0]?.count ?? 0,
        overdue:     metrics?.overdue[0]?.count     ?? 0,
      },
      assigneePerformance,
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to fetch task analytics." });
  }
};

export default {
  createTaskHandler,
  assignTaskHandler,
  listTasksHandler,
  getTaskDetailHandler,
  updateTaskStatusHandler,
  updateTaskDetailsHandler,
  deleteTasksHandler,
  addTaskFeedbackHandler,
  listTaskFeedbackHandler,
  listTaskStatusHistoryHandler,
  addTaskWorkLinkHandler,
  listTaskWorkLinksHandler,
  deleteTaskWorkLinkHandler,
  reviewTaskWorkLinkHandler,
  listTaskCommentsHandler,
  addTaskCommentHandler,
  getTaskAnalyticsHandler,
};