// backend/src/schemas/authSchemas.ts

import { z } from "zod";

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/**
 * Schema for a standard login request body.
 *
 * @example
 * // Apply to a route:
 * router.post('/login', validateRequest({ body: loginSchema }), loginController);
 */
export const loginSchema = z.object({
  email: z
    .string({ error: "Email is required." })
    .email("Invalid email address.")
    .toLowerCase()
    .trim(),
  password: z
    .string({ error: "Password is required." })
    .min(8, "Password must be at least 8 characters."),
});

/** Inferred TypeScript type for a validated login payload. */
export type LoginPayload = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Add additional auth schemas below as the application grows.
// Examples: registerSchema, forgotPasswordSchema, resetPasswordSchema, etc.
// ---------------------------------------------------------------------------
