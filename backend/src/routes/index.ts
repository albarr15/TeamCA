// file: backend/src/routes/index.ts
import { Router } from "express";
import authRoutes from "./authRoutes.js";
import departmentRoutes from "./departmentRoutes.js";
import internProfileRoutes from "./internProfileRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import userRoutes from "./userRoutes.js";
import dtrRoutes from "./dtrRoutes.js";
import leaveRoutes from "./leaveRoutes.js";
import taskRoutes from "./taskRoutes.js";
import activityRoutes from "./activityRoutes.js";
import taskTemplateRoutes from "./taskTemplateRoutes.js";
import batchRoutes from "./batchRoutes.js";
import productivityRoutes from "./productivityRoutes.js";
import offboardingRoutes from "./offboardingRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/departments", departmentRoutes);
router.use("/intern-profiles", internProfileRoutes);
router.use("/notifications", notificationRoutes);
router.use("/tasks", taskRoutes);
router.use("/activity", activityRoutes);
router.use("/activity-logs", activityRoutes);
router.use("/dtr", dtrRoutes);
router.use("/leave", leaveRoutes);
router.use("/task-templates", taskTemplateRoutes);
router.use("/batches", batchRoutes);
router.use("/productivity", productivityRoutes);
router.use("/offboarding", offboardingRoutes);

export default router;