// backend/src/middlewares/validateRequest.ts

import type { NextFunction, Request, RequestHandler, Response } from "express";
import { type ZodTypeAny, type ZodError } from "zod";
// ADDED: Import standardized response handler
import { sendError } from "../utils/responseHandler.js";

/**
 * Defines which parts of the request can be validated.
 * All fields are optional — only provide schemas for the parts you want validated.
 */
type RequestSchema = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

/**
 * A single, normalized validation error entry returned to the client.
 */
type ValidationErrorEntry = {
  field: string;
  message: string;
};

/**
 * Flattens a ZodError's issues into a list of `{ field, message }` objects,
 * prefixed with the source part of the request (e.g. "body.email").
 */
const flattenZodErrors = (
  error: ZodError,
  prefix: string,
): ValidationErrorEntry[] =>
  error.issues.map((issue) => ({
    field: [prefix, ...issue.path.map(String)].filter(Boolean).join("."),
    message: issue.message,
  }));

/**
 * Middleware factory that validates `req.body`, `req.query`, and/or `req.params`
 * against the provided Zod schemas.
 *
 * - If validation passes, the parsed (coerced) values replace the originals on
 * the request object before `next()` is called, giving downstream handlers
 * fully typed and sanitized data.
 *
 * - If validation fails, it short-circuits with a structured `400 Bad Request`
 * response listing every invalid field.
 *
 * @example
 * router.post('/login', validateRequest({ body: loginSchema }), loginController);
 */
export const validateRequest = (schema: RequestSchema): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationErrors: ValidationErrorEntry[] = [];

    // --- body ---
    if (schema.body) {
      const result = schema.body.safeParse(req.body);
      if (!result.success) {
        validationErrors.push(...flattenZodErrors(result.error, "body"));
      } else {
        req.body = result.data;
      }
    }

    // --- query ---
    if (schema.query) {
      const result = schema.query.safeParse(req.query);
      if (!result.success) {
        validationErrors.push(...flattenZodErrors(result.error, "query"));
      } else {
        // req.query is a read-only getter on the underlying IncomingMessage when
        // using the standalone `router` package, so direct assignment throws.
        // Mutate the existing object in-place instead.
        Object.keys(req.query).forEach((k) => delete (req.query as Record<string, unknown>)[k]);
        Object.assign(req.query, result.data);
      }
    }

    // --- params ---
    if (schema.params) {
      const result = schema.params.safeParse(req.params);
      if (!result.success) {
        validationErrors.push(...flattenZodErrors(result.error, "params"));
      } else {
        req.params = result.data as Record<string, string>;
      }
    }

    if (validationErrors.length > 0) {
      // CHANGED: Use sendError utility to standardize the output format
      sendError(
        res,
        "Validation failed.",
        400,
        { errors: validationErrors }
      );
      
      return; // Stop execution here to satisfy the 'void' return type
    }

    next();
  };
};

export default validateRequest;