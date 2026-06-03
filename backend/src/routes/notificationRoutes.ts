import { Router } from "express";
import authenticateJWT from "../middlewares/auth.js";
import {
  listNotificationsHandler,
  markAllNotificationsAsReadHandler,
  markNotificationAsReadHandler,
  getNotificationPreferencesHandler,
  updateNotificationPreferencesHandler,
} from "../controllers/notificationController.js";

const router = Router();

router.use(authenticateJWT);

router.get("/", listNotificationsHandler);
router.patch("/read-all", markAllNotificationsAsReadHandler);
router.patch("/:notificationId/read", markNotificationAsReadHandler);

// Notification preferences (per-user, persisted on the User document)
router.get("/preferences", getNotificationPreferencesHandler);
router.patch("/preferences", updateNotificationPreferencesHandler);

export default router;