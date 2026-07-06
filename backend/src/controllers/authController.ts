import { Request, Response } from "express";
// ADDED: Import standardized response handlers
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { type LoginPayload } from "../schemas/authSchemas.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import InternProfile from "../models/InternProfile.js";
import Department from "../models/Department.js";
import { logActivity } from "../services/activityService.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "teamca-dev-secret-change-in-production";

if (
  process.env.NODE_ENV === "production" &&
  JWT_SECRET === "teamca-dev-secret-change-in-production"
) {
  throw new Error("JWT_SECRET must be set in production.");
}

export const checkEmail = async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    if (!email) {
      // CHANGED: Standardized error response
      return sendError(res, "Email is required", 400);
    }

    const user = await User.findOne({ email });

    if (!user) {
      // CHANGED: Standardized success response
      return sendSuccess(res, { exists: false, needsSetup: false });
    }

    // Whitelisted user: inactive without password_hash needs setup
    const isWhitelisted = !user.is_active && !user.password_hash;
    if (isWhitelisted) {
      // CHANGED: Standardized success response
      return sendSuccess(res, { exists: true, needsSetup: true });
    }

    // Regular user: exists and active
    // CHANGED: Standardized success response
    return sendSuccess(res, { exists: true, needsSetup: false });
  } catch (error) {
    // CHANGED: Standardized error response and passed error payload
    return sendError(res, "Server error", 500, error);
  }
};

export const login = async (req: Request, res: Response) => {
  // req.body is guaranteed to be a valid LoginPayload by validateRequest middleware
  const { email, password } = req.body as LoginPayload;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // CHANGED: Standardized error response
      return sendError(res, "Invalid email or password", 401);
    }

    if (!user.is_active) {
      // CHANGED: Standardized error response
      return sendError(res, "Account setup is incomplete. Please complete your setup.", 403);
    }

    if (!user.password_hash) {
      // CHANGED: Standardized error response
      return sendError(res, "Account setup is incomplete. Please complete your setup.", 403);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // CHANGED: Standardized error response
      return sendError(res, "Invalid email or password", 401);
    }

    const token = jwt.sign({ user_id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const { ...userData } = user.toObject();

    // log successful login activity
    await logActivity({
      user_id: user._id.toString(),
      user_name: user.email,
      action_type: "login",
      resource_type: "auth",
      description: `Login successful for ${user.email}`,
      status: "success",
      changes: { email: user.email },
    }).catch(() => {}); // Ignore logging errors

    // CHANGED: Standardized success response
    return sendSuccess(res, { token, user: userData });
  } catch (error) {
    // log failed login — email is in scope from the destructure above
    if (email) {
      await logActivity({
        user_id: "anonymous",
        user_name: email,
        action_type: "login",
        resource_type: "auth",
        description: `Login failed for ${email}`,
        status: "failed",
        changes: { reason: "invalid credentials or server error" },
      }).catch(() => {}); // Ignore logging errors
    }
    // CHANGED: Standardized error response and passed error payload
    return sendError(res, "Server error", 500, error);
  }
};

export const completeSetup = async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const first_name = String(req.body?.first_name ?? "").trim();
    const last_name = String(req.body?.last_name ?? "").trim();
    const password = String(req.body?.password ?? "");
    const department_id = String(req.body?.department_id ?? "").trim();
    const school_university = String(req.body?.school_university ?? "").trim();
    const required_hours = Number(req.body?.required_hours);

    if (
      !email ||
      !first_name ||
      !last_name ||
      !password ||
      !department_id ||
      !school_university
    ) {
      // CHANGED: Standardized error response
      return sendError(res, "Missing required fields", 400);
    }

    if (!Number.isFinite(required_hours) || required_hours < 1) {
      // CHANGED: Standardized error response
      return sendError(res, "Required hours must be at least 1", 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      // CHANGED: Standardized error response
      return sendError(res, "Invalid email format", 400);
    }

    // Validate password strength (min 8 chars, uppercase, lowercase, number)
    if (password.length < 8) {
      // CHANGED: Standardized error response
      return sendError(res, "Password must be at least 8 characters long", 400);
    }
    if (!/[A-Z]/.test(password)) {
      // CHANGED: Standardized error response
      return sendError(res, "Password must contain at least one uppercase letter", 400);
    }
    if (!/[a-z]/.test(password)) {
      // CHANGED: Standardized error response
      return sendError(res, "Password must contain at least one lowercase letter", 400);
    }
    if (!/[0-9]/.test(password)) {
      // CHANGED: Standardized error response
      return sendError(res, "Password must contain at least one number", 400);
    }

    // check if whitelisted
    const user = await User.findOne({ email });
    if (!user) {
      // CHANGED: Standardized error response
      return sendError(res, "Email is not whitelisted", 404);
    }
    if (user.is_active) {
      // CHANGED: Standardized error response
      return sendError(res, "Account is already active", 403);
    }
    if (user.password_hash) {
      // CHANGED: Standardized error response
      return sendError(res, "Account setup is already complete", 403);
    }

    // Validate name length
    if (first_name.length < 2 || last_name.length < 2) {
      // CHANGED: Standardized error response
      return sendError(res, "Names must be at least 2 characters", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(department_id)) {
      // CHANGED: Standardized error response
      return sendError(res, "Invalid department", 400);
    }

    const department = await Department.findById(department_id).select("_id");
    if (!department) {
      // CHANGED: Standardized error response
      return sendError(res, "Department not found", 404);
    }

    const departmentRole = user.departments?.[0]?.department_role ?? "Intern";

    // update user with setup info
    const password_hash = await bcrypt.hash(password, 12);
    user.first_name = first_name;
    user.last_name = last_name;
    user.password_hash = password_hash;
    user.departments = [
      {
        department_id: new mongoose.Types.ObjectId(department_id),
        department_role: departmentRole,
      },
    ];
    user.is_active = true;
    await user.save();

    await InternProfile.findOneAndUpdate(
      { user_id: user._id },
      {
        $set: {
          school_university,
          required_hours,
        },
        $setOnInsert: {
          rendered_hours_total: 0,
          days_worked: 0,
          actual_end_date: null,
        },
      },
      {
        new: true,
        setDefaultsOnInsert: true,
        upsert: true,
      },
    );

    // log successful account setup
    await logActivity({
      user_id: user._id.toString(),
      user_name: email,
      action_type: "create",
      resource_type: "auth",
      description: `Account setup completed for ${email}`,
      status: "success",
      changes: {
        email,
        first_name,
        last_name,
        global_role: user.global_role,
        department_id,
        department_role: departmentRole,
        school_university,
        required_hours,
      },
    }).catch(() => {}); // ignore logging errors

    const token = jwt.sign({ user_id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const userData = user.toObject();
    delete userData.password_hash;

    // CHANGED: Standardized success response
    return sendSuccess(res, { token, user: userData });
  } catch (error) {
    // CHANGED: Standardized error response and passed error payload
    return sendError(res, "Server error", 500, error);
  }
};