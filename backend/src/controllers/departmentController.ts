import type { Request, Response } from "express";
// ADDED: Import standardized response handlers
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import {
  type CreateDepartmentPayload,
  type UpdateDepartmentPayload,
} from "../schemas/departmentSchemas.js";
import {
  createDepartment,
  deleteDepartment,
  getAllDepartments,
  getDepartmentById,
  getDepartmentMembers,
  getDepartmentsByIds,
  updateDepartment,
} from "../services/departmentService.js";
import {
  compactActivityChanges,
  logActivityForRequest,
  optionalActivityText,
  safeActivityText,
} from "../utils/activityLogPayload.js";

const getDepartmentIdParam = (req: Request): string => {
  const raw = req.params.departmentId;
  return Array.isArray(raw) ? raw[0] : raw;
};

const asActivityRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const getEntityActivityId = (value: unknown): string | undefined => {
  const record = asActivityRecord(value);
  return optionalActivityText(record._id) ?? optionalActivityText(value);
};

const getDepartmentActivitySnapshot = (
  department: unknown,
): Record<string, unknown> => {
  const record = asActivityRecord(department);
  return compactActivityChanges({
    department_id: optionalActivityText(record._id),
    department_name: optionalActivityText(record.department_name),
    description: optionalActivityText(record.description),
    department_head: getEntityActivityId(record.department_head),
  });
};

const getDepartmentActivityName = (
  department: unknown,
  fallback: string,
): string => {
  const record = asActivityRecord(department);
  return safeActivityText(record.department_name, fallback);
};

export const listDepartments = async (_req: Request, res: Response) => {
  try {
    const reqUser = _req.user;

    // Unauthenticated (e.g. first-time setup form) — return all departments
    if (!reqUser) {
      const departments = await getAllDepartments();
      // CHANGED: Replaced res.status(200).json with sendSuccess
      return sendSuccess(res, departments);
    }

    // Superadmin always sees all departments.
    // Admin sees all departments ONLY when they are not assigned as a
    // department Head — a Head (regardless of global_role) is scoped to
    // their own department to prevent editing other departments.
    const isHead = reqUser.department_role === "Head";

    if (reqUser.global_role === "Superadmin" || (reqUser.global_role === "Admin" && !isHead)) {
      const departments = await getAllDepartments();
      // CHANGED: Replaced res.status(200).json with sendSuccess
      return sendSuccess(res, departments);
    }

    // Head users (any global_role) and all Standard_Users: only their department.
    const departmentIds = reqUser.department_id
      ? [String(reqUser.department_id)]
      : [];
    const departments = await getDepartmentsByIds(departmentIds);
    // CHANGED: Replaced res.status(200).json with sendSuccess
    return sendSuccess(res, departments);
  } catch (error) {
    // CHANGED: Fixed empty error object bug and used sendError
    return sendError(res, "Failed to retrieve departments.", 500, error);
  }
};

export const getDepartment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      // CHANGED: Standardized error response
      return sendError(res, "Authentication required.", 401);
    }

    const requestedDepartmentId = getDepartmentIdParam(req);
    const department = await getDepartmentById(requestedDepartmentId);
    if (!department) {
      // CHANGED: Standardized error response
      return sendError(res, "Department not found.", 404);
    }

    if (
      req.user.global_role === "Superadmin" ||
      req.user.global_role === "Admin"
    ) {
      // CHANGED: Standardized success response
      return sendSuccess(res, department);
    }

    const hasDepartmentAccess =
      typeof req.user.department_id !== "undefined" &&
      String(req.user.department_id) === requestedDepartmentId;

    if (!hasDepartmentAccess) {
      // CHANGED: Standardized error response
      return sendError(res, "Insufficient permissions to view this department.", 403);
    }

    // CHANGED: Standardized success response
    return sendSuccess(res, department);
  } catch (error) {
    // CHANGED: Fixed empty error object bug and used sendError
    return sendError(res, "Failed to retrieve department.", 500, error);
  }
};

export const listDepartmentMembersHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      // CHANGED: Standardized error response
      return sendError(res, "Authentication required.", 401);
    }

    const departmentId = getDepartmentIdParam(req);

    const isPrivileged =
      req.user.global_role === "Superadmin" || req.user.global_role === "Admin";
    const isMemberOfDept =
      typeof req.user.department_id !== "undefined" &&
      String(req.user.department_id) === departmentId;

    if (!isPrivileged && !isMemberOfDept) {
      // CHANGED: Standardized error response
      return sendError(res, "Insufficient permissions to view this department.", 403);
    }

    const role = req.query.role ? String(req.query.role) : undefined;
    const allowedRoles = ["Head", "Supervisor", "Intern"];
    const normalizedRole =
      role && allowedRoles.includes(role)
        ? (role as "Head" | "Supervisor" | "Intern")
        : null;

    const result = await getDepartmentMembers(departmentId, {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      role: normalizedRole,
    });

    // CHANGED: Standardized success response
    return sendSuccess(res, result);
  } catch (error) {
    // CHANGED: Fixed empty error object bug and used sendError
    return sendError(res, "Failed to retrieve department members.", 500, error);
  }
};

export const createDepartmentHandler = async (req: Request, res: Response) => {
  try {
    // req.body is guaranteed to be a valid CreateDepartmentPayload by validateRequest middleware
    const { department_name, description, department_head } =
      req.body as CreateDepartmentPayload;

    const created = await createDepartment(
      department_name,
      description,
      department_head,
    );
    const departmentId = safeActivityText(created._id, "new-department");
    await logActivityForRequest(req, {
      action_type: "create",
      resource_type: "department",
      resource_id: departmentId,
      description: `Department created: ${getDepartmentActivityName(
        created,
        department_name,
      )}`,
      changes: compactActivityChanges({
        department_id: departmentId,
        department_name: getDepartmentActivityName(created, department_name),
        performed_by_user_id: optionalActivityText(req.user?.user_id),
        performed_by_email: optionalActivityText(req.user?.email),
        after: getDepartmentActivitySnapshot(created),
      }),
    });
    
    // CHANGED: Standardized success response with 201 status
    return sendSuccess(res, created, 201);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Department already exists."
    ) {
      // CHANGED: Standardized error response
      return sendError(res, error.message, 409);
    }

    if (error instanceof Error) {
      // CHANGED: Standardized error response
      return sendError(res, error.message, 400);
    }

    // CHANGED: Standardized error response and included raw error
    return sendError(res, "Failed to create department.", 500, error);
  }
};

export const updateDepartmentHandler = async (req: Request, res: Response) => {
  try {
    // req.body is guaranteed to be a valid UpdateDepartmentPayload by validateRequest middleware
    const { department_name, description, department_head } =
      req.body as UpdateDepartmentPayload;

    const departmentId = getDepartmentIdParam(req);

    // A department Head (regardless of global_role) may only edit their own department.
    const isHead = req.user?.department_role === "Head";
    if (isHead && String(req.user?.department_id) !== departmentId) {
      // CHANGED: Standardized error response
      return sendError(res, "Insufficient permissions to update this department.", 403);
    }

    const previous = await getDepartmentById(departmentId);
    const updated = await updateDepartment(departmentId, {
      department_name,
      description,
      department_head,
    });
    await logActivityForRequest(req, {
      action_type: "update",
      resource_type: "department",
      resource_id: departmentId,
      description: `Department updated: ${getDepartmentActivityName(
        updated,
        departmentId,
      )}`,
      changes: compactActivityChanges({
        department_id: departmentId,
        department_name: getDepartmentActivityName(updated, departmentId),
        performed_by_user_id: optionalActivityText(req.user?.user_id),
        performed_by_email: optionalActivityText(req.user?.email),
        changed_fields: Object.entries({
          department_name,
          description,
          department_head,
        })
          .filter(([, value]) => value !== undefined)
          .map(([field]) => field),
        before: getDepartmentActivitySnapshot(previous),
        after: getDepartmentActivitySnapshot(updated),
      }),
    });
    
    // CHANGED: Standardized success response
    return sendSuccess(res, updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Department not found.") {
      // CHANGED: Standardized error response
      return sendError(res, error.message, 404);
    }

    if (error instanceof Error) {
      // CHANGED: Standardized error response
      return sendError(res, error.message, 400);
    }

    // CHANGED: Standardized error response and included raw error
    return sendError(res, "Failed to update department.", 500, error);
  }
};

export const deleteDepartmentHandler = async (req: Request, res: Response) => {
  try {
    const departmentId = getDepartmentIdParam(req);

    // A department Head (regardless of global_role) may not delete any department.
    // Only Superadmin / non-Head Admin may delete.
    const isHead = req.user?.department_role === "Head";
    if (isHead) {
      // CHANGED: Standardized error response
      return sendError(res, "Insufficient permissions to delete a department.", 403);
    }

    const previous = await getDepartmentById(departmentId);
    await deleteDepartment(departmentId);
    await logActivityForRequest(req, {
      action_type: "delete",
      resource_type: "department",
      resource_id: departmentId,
      description: `Department deleted: ${getDepartmentActivityName(
        previous,
        departmentId,
      )}`,
      changes: compactActivityChanges({
        department_id: departmentId,
        department_name: getDepartmentActivityName(previous, departmentId),
        performed_by_user_id: optionalActivityText(req.user?.user_id),
        performed_by_email: optionalActivityText(req.user?.email),
        before: getDepartmentActivitySnapshot(previous),
      }),
    });
    
    // CHANGED: Standardized success response
    return sendSuccess(res, { message: "Department deleted successfully." });
  } catch (error) {
    if (error instanceof Error && error.message === "Department not found.") {
      // CHANGED: Standardized error response
      return sendError(res, error.message, 404);
    }

    if (
      error instanceof Error &&
      error.message.includes("Cannot delete department")
    ) {
      // CHANGED: Standardized error response
      return sendError(res, error.message, 409);
    }

    if (error instanceof Error) {
      // CHANGED: Standardized error response
      return sendError(res, error.message, 400);
    }

    // CHANGED: Standardized error response and included raw error
    return sendError(res, "Failed to delete department.", 500, error);
  }
};

export default {
  listDepartments,
  getDepartment,
  listDepartmentMembersHandler,
  createDepartmentHandler,
  updateDepartmentHandler,
  deleteDepartmentHandler,
};