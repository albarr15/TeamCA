import type { Response } from "express";

export const sendSuccess = (res: Response, data: any, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data: data,
  });
};

export const sendError = (res: Response, message: string, statusCode = 500, rawError: any = null) => {
  const errorResponse: any = {
    success: false,
    message: message,
  };

  if (rawError) {
    errorResponse.error = rawError instanceof Error ? rawError.message : rawError;
  }

  return res.status(statusCode).json(errorResponse);
};