// backend/src/schemas/departmentSchemas.ts

import { z } from "zod";

// ---------------------------------------------------------------------------
// Create Department
// ---------------------------------------------------------------------------

/**
 * Schema for creating a new department.
 *
 * @example
 * router.post("/", authenticateJWT, validateRequest({ body: createDepartmentSchema }), createDepartmentHandler);
 */
export const createDepartmentSchema = z.object({
  department_name: z
    .string({ error: "department_name is required." })
    .trim()
    .min(1, "department_name is required."),
  description: z.string().trim().optional(),
  department_head: z.string().trim().optional(),
});

/** Inferred TypeScript type for a validated create-department payload. */
export type CreateDepartmentPayload = z.infer<typeof createDepartmentSchema>;

// ---------------------------------------------------------------------------
// Update Department
// ---------------------------------------------------------------------------

/**
 * Schema for updating an existing department.
 * At least one field must be supplied.
 *
 * @example
 * router.patch("/:departmentId", authenticateJWT, validateRequest({ body: updateDepartmentSchema }), updateDepartmentHandler);
 */
export const updateDepartmentSchema = z
  .object({
    department_name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    // null is allowed to explicitly unset the department head
    department_head: z.string().trim().nullable().optional(),
  })
  .refine(
    (data) =>
      data.department_name !== undefined ||
      data.description !== undefined ||
      data.department_head !== undefined,
    { message: "At least one field must be provided." },
  );

/** Inferred TypeScript type for a validated update-department payload. */
export type UpdateDepartmentPayload = z.infer<typeof updateDepartmentSchema>;
