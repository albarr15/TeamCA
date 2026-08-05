import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/responseHandler.js";

export interface AppError extends Error {
  statusCode?: number;
}

export const globalErrorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction 
) => {
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  const message = err.message || "Internal Server Error";

  console.error(`[Error] ${req.method} ${req.path} >> Status: ${statusCode}, Message: ${message}`);
  
  if (process.env.NODE_ENV !== "production" && err.stack) {
    console.error(err.stack);
  }

  const rawError = process.env.NODE_ENV !== "production" ? err.stack : null;

  return sendError(res, message, statusCode, rawError);
};