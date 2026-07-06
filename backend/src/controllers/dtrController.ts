import { Request, Response } from "express";
// ADDED: Import standardized response handlers
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import * as dtrService from "../services/dtrService.js";
import { z } from "zod";

type AuthRequest = Request;

const getUserId = (req: AuthRequest): string => {
  const user = req.user;

  if (!user) {
    throw new Error("Unauthorized: Missing user");
  }

  return user.user_id.toString();
};

export const timeIn = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const result = await dtrService.timeIn(userId);

    // CHANGED: Standardized success response (frontend interceptor will unwrap this automatically)
    return sendSuccess(res, result);
  } catch (error: unknown) {
    const err = error as any;

    // Active session prevention: return structured 409 Conflict with session details
    if (err.code === "ACTIVE_SESSION") {
      // CHANGED: Preserved this specific custom response structure because the frontend 
      // likely relies on the 'activeSession' object to recover the UI state.
      return res.status(409).json({
        success: false,
        code: "ACTIVE_SESSION",
        message: err.message,
        activeSession: err.activeSession,
      });
    }

    // CHANGED: Standardized error response
    return sendError(res, err.message, 400, err);
  }
};

export const timeOut = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const schema = z.object({
      remarks: z.string().min(1, "Activity log is required to clock out."),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      // CHANGED: Standardized error response for Zod validation failure
      return sendError(res, parsed.error.issues[0]?.message ?? "Invalid payload", 400);
    }
    
    const { remarks } = parsed.data;

    const result = await dtrService.timeOut(userId, remarks);

    // CHANGED: Standardized success response
    return sendSuccess(res, result);
  } catch (error: unknown) {
    const err = error as Error;

    // CHANGED: Standardized error response
    return sendError(res, err.message, 400, err);
  }
};

export const getMyDTR = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const dtrs = await dtrService.getMyDTR(userId);

    // CHANGED: Standardized success response. The 'count' property was removed 
    // because the frontend interceptor only extracts 'data' anyway.
    return sendSuccess(res, dtrs);
  } catch (error: unknown) {
    const err = error as Error;

    // CHANGED: Standardized error response
    return sendError(res, err.message, 500, err);
  }
};

/**
 * GET ACTIVE SESSION
 * GET /dtr/active-session
 * Returns the current active clock-in session for the authenticated user, if any.
 * Used on page load / reconnect to recover UI state without requiring a full DTR fetch.
 */
export const getActiveSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const result = await dtrService.getActiveSession(userId);

    // CHANGED: Standardized success response
    return sendSuccess(res, result);
  } catch (error: unknown) {
    const err = error as Error;

    // CHANGED: Standardized error response
    return sendError(res, err.message, 500, err);
  }
};

/**
 * START BREAK
 * POST /dtr/break-start
 * Body: { breakType?: "lunch" | "rest" | "other" }
 */
export const startBreak = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const schema = z.object({
      breakType: z.enum(["lunch", "rest", "other"]).optional(),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      // CHANGED: Standardized error response
      return sendError(res, "Invalid payload", 400);
    }

    const { breakType = "rest" } = parsed.data;

    const result = await dtrService.startBreak(userId, breakType);

    // CHANGED: Standardized success response
    return sendSuccess(res, result);
  } catch (error: unknown) {
    const err = error as Error;

    // CHANGED: Standardized error response
    return sendError(res, err.message, 400, err);
  }
};

/**
 * END BREAK
 * POST /dtr/break-end
 */
export const endBreak = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const result = await dtrService.endBreak(userId);

    // CHANGED: Standardized success response
    return sendSuccess(res, result);
  } catch (error: unknown) {
    const err = error as Error;

    // CHANGED: Standardized error response
    return sendError(res, err.message, 400, err);
  }
};

/**
 * GET SUMMARY - WEEK
 * GET /dtr/summary/week
 */
export const getSummaryWeek = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const summary = await dtrService.getSummary(userId, "week");

    // CHANGED: Standardized success response
    return sendSuccess(res, summary);
  } catch (error: unknown) {
    const err = error as Error;

    // CHANGED: Standardized error response
    return sendError(res, err.message, 500, err);
  }
};

/**
 * GET SUMMARY - MONTH
 * GET /dtr/summary/month
 */
export const getSummaryMonth = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const summary = await dtrService.getSummary(userId, "month");

    // CHANGED: Standardized success response
    return sendSuccess(res, summary);
  } catch (error: unknown) {
    const err = error as Error;

    // CHANGED: Standardized error response
    return sendError(res, err.message, 500, err);
  }
};

/**
 * GET HISTORY - PAGINATED
 * GET /dtr/history?page=1&limit=10&date_from=2024-01-01&date_to=2024-01-31&status=present&sort_by=date_desc
 */
export const getHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { page, limit, date_from, date_to, status, sort_by } = req.query;

    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 10;

    const filters = {
      date_from: date_from as string | undefined,
      date_to: date_to as string | undefined,
      status: status as string | undefined,
      sort_by: sort_by as string | undefined,
    };

    // Changed: getHistoryWithLeaves instead of getHistoryPaginated
    const result = await dtrService.getHistoryWithLeaves(
      userId,
      pageNum,
      limitNum,
      filters,
    );

    // CHANGED: Standardized success response
    return sendSuccess(res, result);
  } catch (error: unknown) {
    const err = error as Error;
    // CHANGED: Standardized error response
    return sendError(res, err.message, 500, err);
  }
};