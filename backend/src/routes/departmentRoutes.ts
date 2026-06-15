import { Router } from "express";
import {
  createDepartmentHandler,
  deleteDepartmentHandler,
  getDepartment,
  listDepartmentMembersHandler,
  listDepartments,
  updateDepartmentHandler,
} from "../controllers/departmentController.js";
import authenticateJWT from "../middlewares/auth.js";
import { requireGlobalRole } from "../middlewares/rbac.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from "../schemas/departmentSchemas.js";

const router = Router();

router.get("/", listDepartments);
router.get("/:departmentId", authenticateJWT, getDepartment);
router.get(
  "/:departmentId/members",
  authenticateJWT,
  listDepartmentMembersHandler,
);
router.post(
  "/",
  authenticateJWT,
  requireGlobalRole("Superadmin", "Admin"),
  validateRequest({ body: createDepartmentSchema }),
  createDepartmentHandler,
);
router.patch(
  "/:departmentId",
  authenticateJWT,
  requireGlobalRole("Superadmin", "Admin"),
  validateRequest({ body: updateDepartmentSchema }),
  updateDepartmentHandler,
);
router.delete(
  "/:departmentId",
  authenticateJWT,
  requireGlobalRole("Superadmin", "Admin"),
  deleteDepartmentHandler,
);

export default router;
