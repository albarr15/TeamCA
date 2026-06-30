// backend/src/controllers/leaveController.ts

import type { Request, Response } from "express";
// ADDED: Import standardized response handlers
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import {
  type CreateLeavePayload,
  type ReviewLeavePayload,
} from "../schemas/leaveSchemas.js";
import * as leaveService from "../services/leaveService.js";
import {
  compactActivityChanges,
  logActivityForRequest,
  optionalActivityText,
} from "../utils/activityLogPayload.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

const getUserId = (req: Request): string => {
  if (!req.user) throw new Error("Unauthorized: Missing user");
  return String(req.user.user_id);
};

const getRouteParam = (
  value: string | string[] | undefined,
  name: string,
): string => {
  if (!value || Array.isArray(value)) {
    throw new Error(`${name} is required.`);
  }

  return value;
};

// ─── handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /leave
 * Create a new leave request for the authenticated user.
 */
export const createLeaveHandler = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    // req.body is guaranteed to be a valid CreateLeavePayload by validateRequest middleware
    const payload = req.body as CreateLeavePayload;

    const leave = await leaveService.createLeave({
      userId,
      leaveType: payload.leaveType,
      startDate: payload.startDate,
      endDate: payload.endDate,
      reason: payload.reason,
    });

    // CHANGED: Standardized success response with 201
    return sendSuccess(res, leave, 201);
  } catch (error) {
    const err = error as Error;
    const isValidation =
      err.message.includes("overlap") ||
      err.message.includes("Invalid date") ||
      err.message.includes("startDate must be");
      
    // CHANGED: Standardized error response while keeping the dynamic status code
    return sendError(
      res, 
      err.message || "Failed to create leave request.", 
      isValidation ? 400 : 500, 
      error
    );
  }
};

/**
 * GET /leave/me
 * Get all leave requests for the authenticated user.
 */
export const getMyLeavesHandler = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const leaves = await leaveService.getMyLeaves(userId);
    
    // CHANGED: Standardized success response
    return sendSuccess(res, leaves);
  } catch (error) {
    const err = error as Error;
    // CHANGED: Standardized error response
    return sendError(res, err.message || "Failed to fetch leaves.", 500, error);
  }
};

/**
 * GET /leave/pending
 * Get pending leaves scoped to the reviewer's role:
 * - Admin/Superadmin → all pending leaves
 * - Department Head  → pending leaves in their department(s) only
 */
export const getPendingLeavesHandler = async (req: Request, res: Response) => {
  try {
    const actorId = getUserId(req);
    const leaves = await leaveService.getPendingLeaves(actorId);
    
    // CHANGED: Standardized success response
    return sendSuccess(res, leaves);
  } catch (error) {
    const err = error as Error;
    // CHANGED: Standardized error response
    return sendError(res, err.message || "Failed to fetch pending leaves.", 500, error);
  }
};

/**
 * PATCH /leave/:leaveId/approve
 * Approve or reject a leave request.
 * Body: { status: "approved" | "rejected", rejectionReason?: string }
 *
 * Uses a single endpoint to stay compatible with the existing frontend leaveService
 * which calls PATCH /leave/:id/approve with { status: "approved" | "rejected" }.
 */
export const reviewLeaveHandler = async (req: Request, res: Response) => {
  try {
    const actorId = getUserId(req);
    const leaveId = getRouteParam(req.params.leaveId, "leaveId");

    // req.body is guaranteed to be a valid ReviewLeavePayload by validateRequest middleware
    const payload = req.body as ReviewLeavePayload;

    let leave;

    if (payload.status === "approved") {
      leave = await leaveService.approveLeave({ leaveId, actorId });
    } else {
      // Business rule: rejectionReason is required when rejecting
      if (!payload.rejectionReason) {
        // CHANGED: Standardized error response
        return sendError(res, "rejectionReason is required when rejecting a leave.", 400);
      }
      leave = await leaveService.rejectLeave({
        leaveId,
        actorId,
        rejectionReason: payload.rejectionReason,
      });
    }

    await logActivityForRequest(req, {
      action_type: "update",
      resource_type: "dtr",
      resource_id: leaveId,
      description: `Leave request ${payload.status}.`,
      changes: compactActivityChanges({
        record_type: "leave",
        leave_id: leaveId,
        requesting_user_id: optionalActivityText(leave?.userId),
        approver_user_id: actorId,
        approver_email: optionalActivityText(req.user?.email),
        outcome: payload.status,
        rejection_reason:
          payload.status === "rejected"
            ? payload.rejectionReason
            : undefined,
      }),
    });

    // CHANGED: Standardized success response
    return sendSuccess(res, leave);
  } catch (error) {
    const err = error as Error;
    const isNotFound = err.message.includes("not found");
    const isBadState = err.message.includes("Cannot");
    const isMissingReason = err.message.includes("required");
    const statusCode = isNotFound
      ? 404
      : isBadState || isMissingReason
        ? 400
        : 500;
        
    // CHANGED: Standardized error response while keeping dynamic status code
    return sendError(res, err.message, statusCode, error);
  }
};

/**
 * PATCH /leave/:leaveId/cancel
 * Cancel own pending leave request.
 */
export const cancelLeaveHandler = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const leaveId = getRouteParam(req.params.leaveId, "leaveId");

    const leave = await leaveService.cancelLeave(userId, leaveId);

    // CHANGED: Standardized success response
    return sendSuccess(res, leave);
  } catch (error) {
    const err = error as Error;
    const isNotFound = err.message.includes("not found");
    const isForbidden = err.message.includes("your own");
    const isBadState = err.message.includes("Only pending");
    const statusCode = isNotFound
      ? 404
      : isForbidden
        ? 403
        : isBadState
          ? 400
          : 500;
          
    // CHANGED: Standardized error response while keeping dynamic status code
    return sendError(res, err.message, statusCode, error);
  }
};