import { Request, Response } from "express";
import {
  type CreateWhitelistPayload,
  type ActivateWhitelistPayload,
  type CreateUserPayload,
} from "../schemas/userSchemas.js";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import {
  createUser as createUserService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
  deleteWhitelistedUser,
  createWhitelistedUser,
  activateWhitelistedUser,
  getUserById as getUserByIdService,
} from "../services/userService.js";
import { createNotificationsForRecipients } from "../services/notificationService.js";
import {
  emitUsersDirectoryUpdated,
  emitUsersNotification,
} from "../socket/io.js";
import {
  compactActivityChanges,
  logActivityForRequest,
  optionalActivityText,
  safeActivityText,
} from "../utils/activityLogPayload.js";
import {
  assignUserToBatches,
  getUserIdsInBatch,
} from "../services/batchService.js";

type AuthUser = NonNullable<Request["user"]>;

const isSuperadmin = (user: AuthUser): boolean =>
  user.global_role === "Superadmin";

const isSupervisorAdmin = (user: AuthUser): boolean =>
  user.global_role === "Admin" && user.department_role === "Supervisor";

const isHeadAdmin = (user: AuthUser): boolean =>
  user.global_role === "Admin" && user.department_role === "Head";

const canViewAllUsers = (user: AuthUser): boolean =>
  isSuperadmin(user) || isSupervisorAdmin(user);

const getDepartmentIds = (userLike: {
  departments?: Array<{ department_id?: unknown }>;
}): string[] => {
  return [
    ...new Set(
      (userLike.departments ?? [])
        .map((department) => department.department_id)
        .filter((departmentId): departmentId is unknown => !!departmentId)
        .map((departmentId) => String(departmentId)),
    ),
  ];
};

const sharesAtLeastOneDepartment = (
  actor: AuthUser,
  targetUser: { departments?: Array<{ department_id?: unknown }> },
): boolean => {
  const actorDepartmentIds = getDepartmentIds({
    departments: actor.department_id
      ? [{ department_id: actor.department_id }]
      : [],
  });
  const targetDepartmentIds = getDepartmentIds(targetUser);

  if (actorDepartmentIds.length === 0 || targetDepartmentIds.length === 0) {
    return false;
  }

  return targetDepartmentIds.some((departmentId) =>
    actorDepartmentIds.includes(departmentId),
  );
};

const getUserIdParam = (req: Request): string => {
  const raw = req.params.userId;
  return Array.isArray(raw) ? raw[0] : raw;
};

const getActiveSuperadminIds = async (): Promise<string[]> => {
  const superadmins = await User.find({
    global_role: "Superadmin",
    is_active: true,
  })
    .select("_id")
    .lean();

  return [...new Set(superadmins.map((item) => String(item._id)))];
};

const getActiveUserDirectorySubscriberIds = async (): Promise<string[]> => {
  const managers = await User.find({
    is_active: true,
    $or: [
      { global_role: "Superadmin" },
      {
        global_role: "Admin",
        "departments.department_role": { $in: ["Head", "Supervisor"] },
      },
    ],
  })
    .select("_id")
    .lean();

  return [...new Set(managers.map((item) => String(item._id)))];
};

const asActivityRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const getUserActivitySnapshot = (
  user: unknown,
): Record<string, unknown> => {
  const record = asActivityRecord(user);
  const rawDepartments = record.departments;
  const departments = Array.isArray(rawDepartments)
    ? rawDepartments.map((department) => {
        const departmentRecord = asActivityRecord(department);
        return compactActivityChanges({
          department_id: optionalActivityText(departmentRecord.department_id),
          department_role: optionalActivityText(
            departmentRecord.department_role,
          ),
        });
      })
    : undefined;

  return compactActivityChanges({
    user_id: optionalActivityText(record._id),
    email: optionalActivityText(record.email),
    first_name: optionalActivityText(record.first_name),
    last_name: optionalActivityText(record.last_name),
    global_role: optionalActivityText(record.global_role),
    is_active: record.is_active,
    departments,
    working_hours: record.working_hours,
    working_days: record.working_days,
  });
};

const getUserActivityId = (user: unknown, fallback: string): string => {
  const record = asActivityRecord(user);
  return safeActivityText(record._id, fallback);
};

const getUserActivityEmail = (user: unknown, fallback = "unknown email") => {
  const record = asActivityRecord(user);
  return safeActivityText(record.email, fallback);
};

/**
 * Get all users
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const isGlobalManager = canViewAllUsers(req.user);
    const isDepartmentScoped = isHeadAdmin(req.user);

    if (!isGlobalManager && !isDepartmentScoped) {
      return res
        .status(403)
        .json({ message: "Insufficient role permissions." });
    }

    const batchIdFilter = typeof req.query.batch_id === "string"
      ? req.query.batch_id.trim()
      : "";
    const batchUserIds = batchIdFilter
      ? await getUserIdsInBatch(batchIdFilter)
      : null;

    let users;
    if (isGlobalManager) {
      users = await User.find(
        batchUserIds ? { _id: { $in: batchUserIds } } : {},
        "-password_hash",
      );
    } else if (isDepartmentScoped && req.user.department_id) {
      const departmentFilter = {
        is_active: true,
        departments: {
          $elemMatch: {
            department_id: req.user.department_id,
          },
        },
      };
      users = await User.find(
        batchUserIds
          ? { ...departmentFilter, _id: { $in: batchUserIds } }
          : departmentFilter,
        "-password_hash",
      );
    } else {
      return res
        .status(403)
        .json({ message: "Insufficient role permissions." });
    }

    res.json(users);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    let userId: string = String(req.params.userId);

    if (userId === "me") {
      const authUser = req.user;
      if (!authUser?.user_id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      userId = String(authUser.user_id);
    }

    const user = await getUserByIdService(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Create a new user
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    // req.body is guaranteed to be a valid CreateUserPayload by validateRequest middleware
    const {
      first_name,
      last_name,
      email,
      password_hash,
      global_role,
      departments,
      department_id,
      department_role,
      is_active,
      working_hours,
      working_days,
      batch_ids: payloadBatchIds,
    } = req.body as CreateUserPayload;

    const normalizedDepartments = Array.isArray(departments)
      ? departments.filter((d) => d && d.department_id && d.department_role)
      : department_id && department_role
        ? [{ department_id, department_role }]
        : [];

    const newUser = await createUserService({
      first_name,
      last_name,
      email,
      password_hash,
      global_role,
      is_active,
      working_hours,
      working_days,
      departments: normalizedDepartments,
    });

    const batchIds = (payloadBatchIds ?? []).filter((id) => id.trim().length > 0);
    if (batchIds.length > 0) {
      try {
        await assignUserToBatches(getUserActivityId(newUser, "new-user"), batchIds);
      } catch (_err) {
        // batch assignment failure shouldn't block user creation; surfaced separately by the UI
      }
    }

    const targetUserId = getUserActivityId(newUser, "new-user");
    await logActivityForRequest(req, {
      action_type: "create",
      resource_type: "user",
      resource_id: targetUserId,
      description: `User created: ${getUserActivityEmail(newUser, email)}`,
      changes: compactActivityChanges({
        target_user_id: targetUserId,
        target_user_email: getUserActivityEmail(newUser, email),
        performed_by_user_id: optionalActivityText(req.user?.user_id),
        performed_by_email: optionalActivityText(req.user?.email),
        after: getUserActivitySnapshot(newUser),
      }),
    });

    res.status(201).json(newUser);
  } catch (err: unknown) {
    const error = err as Error;

    res.status(400).json({ message: error.message || "Failed to create user" });
  }
};

export const createWhitelistedUserHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    // req.body is guaranteed to be a valid CreateWhitelistPayload by validateRequest middleware
    const { email, global_role, department_role, department_id } =
      req.body as CreateWhitelistPayload;

    const newUser = await createWhitelistedUser({
      email,
      global_role,
      department_id,
      department_role,
    });

    const targetUserId = getUserActivityId(newUser, "new-whitelisted-user");
    await logActivityForRequest(req, {
      action_type: "create",
      resource_type: "user",
      resource_id: targetUserId,
      description: `Whitelisted user created: ${getUserActivityEmail(
        newUser,
        email,
      )}`,
      changes: compactActivityChanges({
        target_user_id: targetUserId,
        target_user_email: getUserActivityEmail(newUser, email),
        performed_by_user_id: optionalActivityText(req.user?.user_id),
        performed_by_email: optionalActivityText(req.user?.email),
        after: getUserActivitySnapshot(newUser),
      }),
    });

    res.status(201).json(newUser);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to whitelist email";

    res.status(400).json({ message: errorMessage });
  }
};

export const activateWhitelistedUserHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getUserIdParam(req);

    // req.body is guaranteed to be a valid ActivateWhitelistPayload by validateRequest middleware
    const {
      first_name,
      last_name,
      password,
      password_hash: suppliedPasswordHash,
      global_role,
      department_id,
      department_role,
      batch_ids: payloadBatchIds,
    } = req.body as ActivateWhitelistPayload;

    // Schema refine ensures at least one of password / password_hash is present
    const password_hash =
      suppliedPasswordHash || (await bcrypt.hash(password!, 12));

    const user = await activateWhitelistedUser(userId, {
      first_name,
      last_name,
      password_hash,
      global_role,
      department_id,
      department_role,
    });

    const batchIds = (payloadBatchIds ?? []).filter((id) => id.trim().length > 0);
    if (batchIds.length > 0 && department_role === "Intern") {
      try {
        await assignUserToBatches(getUserActivityId(user, userId), batchIds);
      } catch (_err) {
        // non-fatal
      }
    }

    await logActivityForRequest(req, {
      action_type: "update",
      resource_type: "user",
      resource_id: getUserActivityId(user, userId),
      description: `Whitelisted user activated: ${getUserActivityEmail(
        user,
        userId,
      )}`,
      changes: compactActivityChanges({
        target_user_id: getUserActivityId(user, userId),
        target_user_email: getUserActivityEmail(user, userId),
        performed_by_user_id: optionalActivityText(req.user?.user_id),
        performed_by_email: optionalActivityText(req.user?.email),
        changed_fields: [
          "first_name",
          "last_name",
          "password_hash",
          "global_role",
          "departments",
          "is_active",
        ],
        after: getUserActivitySnapshot(user),
      }),
    });

    return res.json(user);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));

    return res.status(400).json({
      message: error.message || "Failed to activate whitelisted user",
    });
  }
};

export const deleteWhitelistedUserHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user || req.user.global_role !== "Superadmin") {
      return res
        .status(403)
        .json({ message: "Forbidden: Only Superadmins can access this." });
    }

    const userId = getUserIdParam(req);
    const userToDelete = await User.findById(userId)
      .select("email first_name last_name global_role is_active departments")
      .lean();
    const result = await deleteWhitelistedUser(userId);

    const directorySubscribers = await getActiveUserDirectorySubscriberIds();
    emitUsersDirectoryUpdated(directorySubscribers, {
      event_type: "user_deleted",
      user_id: userId,
      actor_id: String(req.user.user_id),
      updated_at: new Date().toISOString(),
    });

    await logActivityForRequest(req, {
      action_type: "delete",
      resource_type: "user",
      resource_id: userId,
      description: `Whitelisted user deleted: ${getUserActivityEmail(
        userToDelete,
        userId,
      )}`,
      changes: compactActivityChanges({
        target_user_id: userId,
        target_user_email: getUserActivityEmail(userToDelete, userId),
        performed_by_user_id: optionalActivityText(req.user?.user_id),
        performed_by_email: optionalActivityText(req.user?.email),
        before: getUserActivitySnapshot(userToDelete),
      }),
    });

    return res.json(result);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));

    return res.status(400).json({
      message: error.message || "Failed to cancel whitelisted user",
    });
  }
};

/**
 * Update user details (PUT /users/:userId)
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const userId = getUserIdParam(req);
    const payload = req.body || {};

    const previousUser = await User.findById(userId)
      .select(
        "first_name last_name email global_role is_active departments working_hours working_days",
      )
      .lean();

    if (!previousUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const actor = req.user;
    const actorCanManageFully = canViewAllUsers(actor);
    const actorIsHead = isHeadAdmin(actor);
    const actorIsSelf = String(actor.user_id) === String(previousUser._id);

    if (!actorCanManageFully && !actorIsHead && !actorIsSelf) {
      return res
        .status(403)
        .json({ message: "Insufficient role permissions." });
    }

    if (actorIsSelf) {
      const disallowedSelfFields = [
        "global_role",
        "departments",
        "is_active",
        "password_hash",
      ];

      const includesRestrictedField = disallowedSelfFields.some(
        (field) => payload?.[field] !== undefined,
      );

      if (includesRestrictedField) {
        return res.status(403).json({
          message: "You can only edit your basic profile fields.",
        });
      }
    } else if (actorIsHead) {
      if (!sharesAtLeastOneDepartment(actor, previousUser)) {
        return res.status(403).json({
          message: "Heads can only edit users within their department.",
        });
      }

      const disallowedHeadFields = [
        "global_role",
        "departments",
        "is_active",
        "password_hash",
      ];

      const includesRestrictedField = disallowedHeadFields.some(
        (field) => payload?.[field] !== undefined,
      );

      if (includesRestrictedField) {
        return res.status(403).json({
          message: "Heads can only edit basic profile fields.",
        });
      }
    }

    if (!isSuperadmin(actor)) {
      if (previousUser.global_role === "Superadmin") {
        return res.status(403).json({
          message: "Only Superadmins can modify Superadmin accounts.",
        });
      }

      if (payload?.global_role === "Superadmin") {
        return res.status(403).json({
          message: "Only Superadmins can assign the Superadmin role.",
        });
      }
    }

    const sanitizedPayload = actorIsSelf
      ? {
          first_name: payload?.first_name,
          last_name: payload?.last_name,
          email: payload?.email,
        }
      : actorIsHead
        ? {
            first_name: payload?.first_name,
            last_name: payload?.last_name,
          }
        : payload;

    const hasAnyFieldToUpdate = Object.values(sanitizedPayload ?? {}).some(
      (value) => value !== undefined,
    );

    if (!hasAnyFieldToUpdate) {
      return res.status(400).json({
        message: "No editable fields provided.",
      });
    }

    const updatedUser = await updateUserService(userId, sanitizedPayload);

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const [recipientIds, directorySubscribers] = await Promise.all([
      getActiveSuperadminIds(),
      getActiveUserDirectorySubscriberIds(),
    ]);

    const actorId = req.user ? String(req.user.user_id) : undefined;

    const updatedFields = Object.keys(payload || {}).filter(
      (key) => payload?.[key] !== undefined,
    );

    const updatedEntityId = String(updatedUser._id || userId);

    await logActivityForRequest(req, {
      action_type: "update",
      resource_type: "user",
      resource_id: updatedEntityId,
      description: `User updated: ${getUserActivityEmail(
        updatedUser,
        updatedEntityId,
      )}`,
      changes: compactActivityChanges({
        target_user_id: updatedEntityId,
        target_user_email: getUserActivityEmail(updatedUser, updatedEntityId),
        performed_by_user_id: optionalActivityText(req.user?.user_id),
        performed_by_email: optionalActivityText(req.user?.email),
        changed_fields: updatedFields,
        before: getUserActivitySnapshot(previousUser),
        after: getUserActivitySnapshot(updatedUser),
      }),
    });

    const profileNotificationRecipients = [
      ...new Set([...recipientIds, updatedEntityId]),
    ];

    const notifications = await createNotificationsForRecipients(
      profileNotificationRecipients,
      {
        actorId,
        eventType: "user_profile_updated",
        title: "User profile updated",
        message:
          `${updatedUser.first_name || "User"} ${
            updatedUser.last_name || ""
          }`.trim() + " updated their profile information.",
        entityType: "user",
        entityId: updatedEntityId,
        metadata: {
          user_id: updatedEntityId,
          updated_fields: updatedFields,
        },
      },
    );

    for (const notification of notifications) {
      emitUsersNotification([notification.recipient_id], notification);
    }

    const previousDepartmentRole =
      previousUser.departments?.[0]?.department_role;

    const updatedDepartmentRole = updatedUser.departments?.[0]?.department_role;

    const roleChanged =
      previousUser.global_role !== updatedUser.global_role ||
      previousDepartmentRole !== updatedDepartmentRole;

    if (roleChanged) {
      const roleRecipientIds = [...new Set([...recipientIds, updatedEntityId])];

      const roleNotifications = await createNotificationsForRecipients(
        roleRecipientIds,
        {
          actorId,
          eventType: "user_role_changed",
          title: "User role updated",
          message:
            `${updatedUser.first_name || "User"} ${
              updatedUser.last_name || ""
            }`.trim() + " role assignment was updated.",
          entityType: "user",
          entityId: updatedEntityId,
          metadata: {
            user_id: updatedEntityId,
            previous_global_role: previousUser.global_role,
            new_global_role: updatedUser.global_role,
            previous_department_role: previousDepartmentRole,
            new_department_role: updatedDepartmentRole,
          },
        },
      );

      for (const notification of roleNotifications) {
        emitUsersNotification([notification.recipient_id], notification);
      }
    }

    if (previousUser.is_active !== updatedUser.is_active) {
      const activationRecipientIds = [
        ...new Set([...recipientIds, updatedEntityId]),
      ];

      const activationNotifications = await createNotificationsForRecipients(
        activationRecipientIds,
        {
          actorId,
          eventType: "user_activation_changed",
          title: "User activation status changed",
          message:
            `${updatedUser.first_name || "User"} ${
              updatedUser.last_name || ""
            }`.trim() +
            ` was ${updatedUser.is_active ? "activated" : "deactivated"}.`,
          entityType: "user",
          entityId: updatedEntityId,
          metadata: {
            user_id: updatedEntityId,
            previous_is_active: previousUser.is_active,
            new_is_active: updatedUser.is_active,
          },
        },
      );

      for (const notification of activationNotifications) {
        emitUsersNotification([notification.recipient_id], notification);
      }
    }

    emitUsersDirectoryUpdated(directorySubscribers, {
      event_type: "user_updated",
      user_id: updatedEntityId,
      updated_fields: updatedFields,
      actor_id: actorId,
      updated_at: new Date().toISOString(),
    });

    return res.json(updatedUser);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));

    return res.status(400).json({
      message: error.message || "Failed to update user",
    });
  }
};

export const getWhitelistedUsers = async (req: Request, res: Response) => {
  try {
    // Authenticated user
    const currentUser = req.user; // assume authMiddleware adds req.user

    if (!currentUser || currentUser.global_role !== "Superadmin") {
      return res
        .status(403)
        .json({ message: "Forbidden: Only Superadmins can access this." });
    }

    const whitelistedUsers = await User.find({
      is_active: false,
      $or: [
        { password_hash: { $exists: false } },
        { password_hash: null },
        { password_hash: "" },
      ],
    })
      .select("-password_hash")
      .sort({ createdAt: -1 })
      .lean();

    res.json(whitelistedUsers);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Delete a user
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const userId = getUserIdParam(req);

    const userToDelete = await User.findById(userId)
      .select("first_name last_name email global_role")
      .lean();

    if (!userToDelete) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const actor = req.user;

    const actorCanDelete = isSuperadmin(actor) || isSupervisorAdmin(actor);

    if (!actorCanDelete) {
      return res.status(403).json({
        message: "Only Supervisor(Admin) or Superadmin can delete users.",
      });
    }

    if (!isSuperadmin(actor)) {
      if (userToDelete.global_role !== "Standard_User") {
        return res.status(403).json({
          message: "Supervisors can only delete Standard Users.",
        });
      }
    }

    const result = await deleteUserService(userId);

    const [recipientIds, directorySubscribers] = await Promise.all([
      getActiveSuperadminIds(),
      getActiveUserDirectorySubscriberIds(),
    ]);

    const actorId = req.user ? String(req.user.user_id) : undefined;

    await logActivityForRequest(req, {
      action_type: "delete",
      resource_type: "user",
      resource_id: userId,
      description: `User deleted: ${getUserActivityEmail(
        userToDelete,
        userId,
      )}`,
      changes: compactActivityChanges({
        target_user_id: userId,
        target_user_email: getUserActivityEmail(userToDelete, userId),
        performed_by_user_id: optionalActivityText(req.user?.user_id),
        performed_by_email: optionalActivityText(req.user?.email),
        before: getUserActivitySnapshot(userToDelete),
      }),
    });

    const notifications = await createNotificationsForRecipients(recipientIds, {
      actorId,
      eventType: "user_deleted",
      title: "User deleted",
      message:
        `${userToDelete.first_name || "User"} ${
          userToDelete.last_name || ""
        }`.trim() + " was deleted by an admin.",
      entityType: "user",
      entityId: userId,
      metadata: {
        user_id: userId,
        email: userToDelete.email,
      },
    });

    for (const notification of notifications) {
      emitUsersNotification([notification.recipient_id], notification);
    }

    emitUsersDirectoryUpdated(directorySubscribers, {
      event_type: "user_deleted",
      user_id: userId,
      actor_id: actorId,
      updated_at: new Date().toISOString(),
    });

    return res.json(result);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));

    return res.status(400).json({
      message: error.message || "Failed to delete user",
    });
  }
};
