import { Router } from "express";
import authenticateJWT from "../middlewares/auth.js";
import { requestLock } from "../middlewares/requestLock.js";
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

const router = Router();

router.use(authenticateJWT);
router.get("/", listTasksHandler);
router.post("/", createTaskHandler);
router.delete("/", deleteTasksHandler);
router.get("/:taskId", getTaskDetailHandler);
router.post("/:taskId/assign", assignTaskHandler);
router.patch("/:taskId",        requestLock, updateTaskDetailsHandler);
router.patch("/:taskId/status", requestLock, updateTaskStatusHandler);
router.get("/:taskId/status-history", listTaskStatusHistoryHandler);
router.get("/:taskId/work-links", listTaskWorkLinksHandler);
router.post("/:taskId/work-links", addTaskWorkLinkHandler);
router.delete("/:taskId/work-links/:workLinkId", deleteTaskWorkLinkHandler);
router.patch("/:taskId/work-links/:workLinkId/review", requestLock, reviewTaskWorkLinkHandler);
router.get("/:taskId/feedback", listTaskFeedbackHandler);
router.post("/:taskId/feedback", addTaskFeedbackHandler);
router.get("/:taskId/comments", listTaskCommentsHandler);
router.post("/:taskId/comments", addTaskCommentHandler);

export default router;
