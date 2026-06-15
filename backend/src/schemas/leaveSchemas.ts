// backend/src/schemas/leaveSchemas.ts

import { z } from "zod";

// ---------------------------------------------------------------------------
// Create Leave Request  (POST /leave)
// ---------------------------------------------------------------------------

/**
 * Schema for filing a new leave request.
 *
 * @example
 * router.post("/", authMiddleware, validateRequest({ body: createLeaveSchema }), createLeaveHandler);
 */
export const createLeaveSchema = z.object({
  leaveType: z
    .enum(["vacation", "sick", "emergency", "unpaid", "other"])
    .optional()
    .default("other"),
  startDate: z.string().min(1, "startDate is required"),
  endDate: z.string().min(1, "endDate is required"),
  reason: z
    .string()
    .min(3, "Reason must be at least 3 characters")
    .max(500),
});

/** Inferred TypeScript type for a validated create-leave payload. */
export type CreateLeavePayload = z.infer<typeof createLeaveSchema>;

// ---------------------------------------------------------------------------
// Review Leave Request  (PATCH /leave/:leaveId/approve)
// ---------------------------------------------------------------------------

/**
 * Schema for approving or rejecting a leave request.
 *
 * NOTE: the business rule that `rejectionReason` is required when
 * `status === "rejected"` is enforced in the controller (not here) because
 * it requires reading the `status` value at runtime, which is context-
 * dependent and more clearly expressed as an early-return guard.
 *
 * @example
 * router.patch("/:leaveId/approve", authMiddleware, validateRequest({ body: reviewLeaveSchema }), reviewLeaveHandler);
 */
export const reviewLeaveSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().trim().max(500).optional(),
});

/** Inferred TypeScript type for a validated review-leave payload. */
export type ReviewLeavePayload = z.infer<typeof reviewLeaveSchema>;
