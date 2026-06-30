import { Request, Response } from "express";
// ADDED: Import standardized response handlers
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { z } from "zod";
import { timeAdjustmentService } from "../services/timeAdjustmentService.js";
import { IUser } from "../models/User.js";
import {
  compactActivityChanges,
  logActivityForRequest,
  optionalActivityText,
} from "../utils/activityLogPayload.js";

// Zod validation schemas
const submitRequestSchema = z.object({
  dtrDate: z.string().datetime(),
  adjustmentType: z.enum(["time_in", "time_out", "manual_entry", "leave"]),
  requestedValue: z.string().min(1),
  reason: z.string().min(1),
  originalValue: z.string().optional(),
});

const reviewRequestSchema = z.object({
  reviewNotes: z.string().optional(),
});

const asActivityRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export const timeAdjustmentController = {
  async submitRequest(req: Request, res: Response) {
    try {
      const user = (req as any).user as IUser;
      const userId = (req as any).user?.user_id || (user as any)?._id;
      if (!userId) {
        // CHANGED: Standardized error response
        return sendError(res, "Unauthorized", 401);
      }
      const validated = submitRequestSchema.parse(req.body);

      const adjustment = await timeAdjustmentService.submitRequest(
        String(userId),
        new Date(validated.dtrDate),
        validated.adjustmentType,
        validated.requestedValue,
        validated.reason,
        validated.originalValue,
      );

      // CHANGED: Standardized success response with 201 Created
      return sendSuccess(res, adjustment, 201);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        // CHANGED: Standardized error response
        return sendError(res, "Validation error", 400, error);
      } else {
        // CHANGED: Standardized error response
        return sendError(res, error.message || "Server error", 500, error);
      }
    }
  },

  async getUserRequests(req: Request, res: Response) {
    try {
      const user = (req as any).user as IUser;
      const userId = (req as any).user?.user_id || (user as any)?._id;
      if (!userId) {
        // CHANGED: Standardized error response
        return sendError(res, "Unauthorized", 401);
      }
      const { status } = req.query;

      const requests = await timeAdjustmentService.getUserRequests(
        String(userId),
        status as string | undefined,
      );

      // CHANGED: Standardized success response
      return sendSuccess(res, requests);
    } catch (error: any) {
      // CHANGED: Standardized error response
      return sendError(res, error.message || "Server error", 500, error);
    }
  },

  async getPendingRequests(req: Request, res: Response) {
    try {
      const user = (req as any).user as IUser;
      const userId = (req as any).user?.user_id || (user as any)?._id;
      if (!userId) {
        // CHANGED: Standardized error response
        return sendError(res, "Unauthorized", 401);
      }

      // Check if user is admin/head
      const isAdmin =
        user.global_role === "Admin" || user.global_role === "Superadmin";
      const isHead = user.departments?.some(
        (d) => d.department_role === "Head",
      );

      if (!isAdmin && !isHead) {
        // CHANGED: Standardized error response
        return sendError(res, "Unauthorized to review requests", 403);
      }

      const departmentId = !isAdmin
        ? user.departments?.[0]?.department_id?.toString()
        : undefined;

      const requests =
        await timeAdjustmentService.getPendingRequests(departmentId);

      // CHANGED: Standardized success response
      return sendSuccess(res, requests);
    } catch (error: any) {
      // CHANGED: Standardized error response
      return sendError(res, error.message || "Server error", 500, error);
    }
  },

  async approveRequest(req: Request, res: Response) {
    try {
      const user = (req as any).user as IUser;
      const userId = (req as any).user?.user_id || (user as any)?._id;
      if (!userId) {
        // CHANGED: Standardized error response
        return sendError(res, "Unauthorized", 401);
      }
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const validated = reviewRequestSchema.parse(req.body);

      // Check if user is admin/head
      const isAdmin =
        user.global_role === "Admin" || user.global_role === "Superadmin";
      const isHead = user.departments?.some(
        (d) => d.department_role === "Head",
      );

      if (!isAdmin && !isHead) {
        // CHANGED: Standardized error response
        return sendError(res, "Unauthorized to approve requests", 403);
      }

      const request = await timeAdjustmentService.approveRequest(
        id,
        String(userId),
        validated.reviewNotes,
      );
      const requestRecord = asActivityRecord(request);

      await logActivityForRequest(req, {
        action_type: "update",
        resource_type: "dtr",
        resource_id: id,
        description: "Time adjustment request approved.",
        changes: compactActivityChanges({
          record_type: "time_adjustment",
          adjustment_request_id: optionalActivityText(requestRecord._id) ?? id,
          dtr_id: optionalActivityText(requestRecord.dtrId),
          requesting_user_id: optionalActivityText(requestRecord.userId),
          approver_user_id: String(userId),
          approver_email: optionalActivityText(req.user?.email),
          outcome: "approved",
          adjustment_type: optionalActivityText(requestRecord.adjustmentType),
          original_value: optionalActivityText(requestRecord.originalValue),
          requested_value: optionalActivityText(requestRecord.requestedValue),
          review_notes: optionalActivityText(requestRecord.reviewNotes),
        }),
      });

      // CHANGED: Standardized success response
      return sendSuccess(res, request);
    } catch (error: any) {
      // CHANGED: Standardized error response
      return sendError(res, error.message || "Server error", 500, error);
    }
  },

  async rejectRequest(req: Request, res: Response) {
    try {
      const user = (req as any).user as IUser;
      const userId = (req as any).user?.user_id || (user as any)?._id;
      if (!userId) {
        // CHANGED: Standardized error response
        return sendError(res, "Unauthorized", 401);
      }
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const validated = reviewRequestSchema.parse(req.body);

      if (!validated.reviewNotes) {
        // CHANGED: Standardized error response
        return sendError(res, "Review notes are required for rejection", 400);
      }

      // Check if user is admin/head
      const isAdmin =
        user.global_role === "Admin" || user.global_role === "Superadmin";
      const isHead = user.departments?.some(
        (d) => d.department_role === "Head",
      );

      if (!isAdmin && !isHead) {
        // CHANGED: Standardized error response
        return sendError(res, "Unauthorized to reject requests", 403);
      }

      const request = await timeAdjustmentService.rejectRequest(
        id,
        String(userId),
        validated.reviewNotes,
      );
      const requestRecord = asActivityRecord(request);

      await logActivityForRequest(req, {
        action_type: "update",
        resource_type: "dtr",
        resource_id: id,
        description: "Time adjustment request rejected.",
        changes: compactActivityChanges({
          record_type: "time_adjustment",
          adjustment_request_id: optionalActivityText(requestRecord._id) ?? id,
          dtr_id: optionalActivityText(requestRecord.dtrId),
          requesting_user_id: optionalActivityText(requestRecord.userId),
          approver_user_id: String(userId),
          approver_email: optionalActivityText(req.user?.email),
          outcome: "rejected",
          adjustment_type: optionalActivityText(requestRecord.adjustmentType),
          original_value: optionalActivityText(requestRecord.originalValue),
          requested_value: optionalActivityText(requestRecord.requestedValue),
          review_notes: optionalActivityText(requestRecord.reviewNotes),
        }),
      });

      // CHANGED: Standardized success response
      return sendSuccess(res, request);
    } catch (error: any) {
      // CHANGED: Standardized error response
      return sendError(res, error.message || "Server error", 500, error);
    }
  },

  async getRequest(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const request = await timeAdjustmentService.getRequest(id);

      if (!request) {
        // CHANGED: Standardized error response
        return sendError(res, "Request not found", 404);
      }

      // CHANGED: Standardized success response
      return sendSuccess(res, request);
    } catch (error: any) {
      // CHANGED: Standardized error response
      return sendError(res, error.message || "Server error", 500, error);
    }
  },
};