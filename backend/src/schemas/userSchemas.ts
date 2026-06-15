// backend/src/schemas/userSchemas.ts

import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------

const globalRoleEnum = z.enum(["Superadmin", "Admin", "Standard_User"]);
const departmentRoleEnum = z.enum(["Head", "Supervisor", "Intern"]);

// ---------------------------------------------------------------------------
// Create Whitelisted User  (POST /users/whitelist)
// ---------------------------------------------------------------------------

/**
 * Schema for whitelisting a new user by email.
 *
 * @example
 * router.post("/whitelist", authMiddleware, validateRequest({ body: createWhitelistSchema }), createWhitelistedUserHandler);
 */
export const createWhitelistSchema = z.object({
  email: z
    .string({ error: "Email is required." })
    .email("Invalid email format.")
    .toLowerCase()
    .trim(),
  global_role: globalRoleEnum.default("Standard_User"),
  department_role: departmentRoleEnum.default("Intern"),
  department_id: z.string().trim().optional(),
});

/** Inferred TypeScript type for a validated whitelist payload. */
export type CreateWhitelistPayload = z.infer<typeof createWhitelistSchema>;

// ---------------------------------------------------------------------------
// Activate Whitelisted User  (POST /users/:userId/activate-whitelist)
// ---------------------------------------------------------------------------

/**
 * Schema for activating a previously whitelisted user.
 * Either `password` (plain-text, min 8 chars) or `password_hash` (bcrypt,
 * must start with "$2") must be supplied — not necessarily both.
 *
 * @example
 * router.post("/:userId/activate-whitelist", authMiddleware, validateRequest({ body: activateWhitelistSchema }), activateWhitelistedUserHandler);
 */
export const activateWhitelistSchema = z
  .object({
    first_name: z
      .string({ error: "first_name is required." })
      .trim()
      .min(2, "Names must be at least 2 characters."),
    last_name: z
      .string({ error: "last_name is required." })
      .trim()
      .min(2, "Names must be at least 2 characters."),
    /** Plain-text password — will be hashed server-side. */
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long.")
      .optional(),
    /** Pre-hashed bcrypt password — must start with "$2". */
    password_hash: z.string().trim().optional(),
    global_role: globalRoleEnum.default("Standard_User"),
    department_id: z.string().trim().optional(),
    department_role: departmentRoleEnum.default("Intern"),
    batch_ids: z.array(z.string().trim().min(1)).optional(),
  })
  .refine((data) => !!data.password || !!data.password_hash, {
    message: "Either password or password_hash is required.",
    path: ["password"],
  })
  .refine(
    (data) => !data.password_hash || data.password_hash.startsWith("$2"),
    {
      message: "Invalid password format.",
      path: ["password_hash"],
    },
  );

/** Inferred TypeScript type for a validated activate-whitelist payload. */
export type ActivateWhitelistPayload = z.infer<typeof activateWhitelistSchema>;

// ---------------------------------------------------------------------------
// Create User  (POST /users/)
// ---------------------------------------------------------------------------

/**
 * Schema for creating a fully-formed user (Superadmin-only route).
 *
 * @example
 * router.post("/", authMiddleware, requireGlobalRole("Superadmin"), validateRequest({ body: createUserSchema }), createUser);
 */
export const createUserSchema = z.object({
  first_name: z
    .string({ error: "first_name is required." })
    .trim()
    .min(1, "first_name is required."),
  last_name: z
    .string({ error: "last_name is required." })
    .trim()
    .min(1, "last_name is required."),
  email: z
    .string({ error: "email is required." })
    .email("Invalid email format.")
    .toLowerCase()
    .trim(),
  password_hash: z
    .string({ error: "password_hash is required." })
    .min(1, "password_hash is required."),
  global_role: globalRoleEnum,
  departments: z
    .array(
      z.object({
        department_id: z.string().min(1),
        department_role: departmentRoleEnum,
      }),
    )
    .optional(),
  // Convenience fields — normalized into `departments` by the controller
  department_id: z.string().optional(),
  department_role: departmentRoleEnum.optional(),
  is_active: z.boolean().optional(),
  working_hours: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
  working_days: z
    .array(
      z.enum(["M", "T", "W", "Th", "F", "Sat", "Sun"]),
    )
    .optional(),
  batch_ids: z.array(z.string().trim().min(1)).optional(),
});

/** Inferred TypeScript type for a validated create-user payload. */
export type CreateUserPayload = z.infer<typeof createUserSchema>;
