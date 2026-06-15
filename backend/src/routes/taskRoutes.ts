import { Router } from "express";
import authenticateJWT from "../middlewares/auth.js";
import { requestLock } from "../middlewares/requestLock.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  addTaskCommentHandler,
  addTaskWorkLinkHandler,
  addTaskFeedbackHandler,
  assignTaskHandler,
  createTaskHandler,
  deleteTasksHandler,
  deleteTaskWorkLinkHandler,
  getTaskDetailHandler,
  listTaskCommentsHandler,
  listTaskFeedbackHandler,
  listTaskWorkLinksHandler,
  listTaskStatusHistoryHandler,
  listTasksHandler,
  reviewTaskWorkLinkHandler,
  updateTaskDetailsHandler,
  updateTaskStatusHandler,
} from "../controllers/taskController.js";
import {
  addTaskCommentSchema,
  addTaskFeedbackSchema,
  addTaskWorkLinkSchema,
  assignTaskSchema,
  createTaskSchema,
  deleteTasksSchema,
  listTasksQuerySchema,
  reviewTaskWorkLinkSchema,
  updateTaskDetailsSchema,
  updateTaskStatusSchema,
} from "../schemas/taskSchemas.js";

const router = Router();

router.use(authenticateJWT);
router.get("/", validateRequest({ query: listTasksQuerySchema }), listTasksHandler);
router.post("/", validateRequest({ body: createTaskSchema }), createTaskHandler);
router.delete("/", validateRequest({ body: deleteTasksSchema }), deleteTasksHandler);
router.get("/:taskId", getTaskDetailHandler);
router.post("/:taskId/assign", validateRequest({ body: assignTaskSchema }), assignTaskHandler);
router.patch("/:taskId",        requestLock, validateRequest({ body: updateTaskDetailsSchema }), updateTaskDetailsHandler);
router.patch("/:taskId/status", requestLock, validateRequest({ body: updateTaskStatusSchema }), updateTaskStatusHandler);
router.get("/:taskId/status-history", listTaskStatusHistoryHandler);
router.get("/:taskId/work-links", listTaskWorkLinksHandler);
router.post("/:taskId/work-links", validateRequest({ body: addTaskWorkLinkSchema }), addTaskWorkLinkHandler);
router.delete("/:taskId/work-links/:workLinkId", deleteTaskWorkLinkHandler);
router.patch("/:taskId/work-links/:workLinkId/review", requestLock, validateRequest({ body: reviewTaskWorkLinkSchema }), reviewTaskWorkLinkHandler);
router.get("/:taskId/feedback", listTaskFeedbackHandler);
router.post("/:taskId/feedback", validateRequest({ body: addTaskFeedbackSchema }), addTaskFeedbackHandler);
router.get("/:taskId/comments", listTaskCommentsHandler);
router.post("/:taskId/comments", validateRequest({ body: addTaskCommentSchema }), addTaskCommentHandler);

export default router;
