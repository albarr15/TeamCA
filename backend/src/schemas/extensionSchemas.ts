// file: backend/src/schemas/extensionSchemas.ts
import { z } from "zod";

// ---------------------------------------------------------------------------
// Create Extension Request  (POST /offboarding/extension-requests)
// ---------------------------------------------------------------------------

/**
 * Schema for filing a new internship extension request.
 *
 * `intern_id` is optional: when omitted, the request is filed for the
 * authenticated user themselves (the common "intern requests their own
 * extension" case). When provided, the actor is filing on behalf of someone
 * else — permitted only for that intern's Head/Supervisor or an Admin/
 * Superadmin (enforced in the service layer, not here).
 */
export const createExtensionRequestSchema = z.object({
  intern_id: z.string().trim().min(1).optional(),
  additional_hours: z.coerce
    .number({ invalid_type_error: "additional_hours must be a number" })
    .min(1, "additional_hours must be at least 1")
    .max(2000, "additional_hours must be 2000 or fewer"),
  reason: z
    .string()
    .trim()
    .min(3, "Reason must be at least 3 characters")
    .max(500),
});

export type CreateExtensionRequestPayload = z.infer<
  typeof createExtensionRequestSchema
>;

// ---------------------------------------------------------------------------
// Review Extension Request  (PATCH /offboarding/extension-requests/:id/review)
// ---------------------------------------------------------------------------

/**
 * NOTE: the business rule that `remarks` is required when `status ===
 * "rejected"` is enforced in the controller (not here), mirroring the
 * leave-request review schema, since it depends on the sibling field's value.
 */
export const reviewExtensionRequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  remarks: z.string().trim().max(500).optional(),
});

export type ReviewExtensionRequestPayload = z.infer<
  typeof reviewExtensionRequestSchema
>;

// ---------------------------------------------------------------------------
// List Extension Requests Query  (GET /offboarding/extension-requests/pending)
// ---------------------------------------------------------------------------

export const listExtensionRequestsQuerySchema = z.object({
  departmentId: z.string().trim().min(1).optional(),
  status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
});

export type ListExtensionRequestsQuery = z.infer<
  typeof listExtensionRequestsQuerySchema
>;