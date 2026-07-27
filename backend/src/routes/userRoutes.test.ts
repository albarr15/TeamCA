import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";

// 1. Mock the authMiddleware BEFORE importing our routes
vi.mock("../middlewares/authMiddleware.js", () => ({
  authMiddleware: async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "No token provided" });
      }
      
      const token = authHeader.split(" ")[1];
      
      // Decode the test token (without verifying the secret) to get the user ID
      const jwtLib = await import("jsonwebtoken");
      const decoded = jwtLib.default.decode(token) as any;
      if (!decoded || !decoded.user_id) {
        return res.status(401).json({ success: false, message: "Invalid token payload" });
      }
      
      // Fetch the actual user we created in our test database
      const User = (await import("../models/User.js")).default;
      const user = await User.findById(decoded.user_id).lean();
      if (!user) return res.status(401).json({ success: false, message: "User not found" });
      
      req.user = {
        user_id: user._id,
        email: user.email,
        global_role: user.global_role,
        department_id: user.departments?.[0]?.department_id,
        department_role: user.departments?.[0]?.department_role,
      };
      
      next();
    } catch (e) {
      return res.status(401).json({ success: false, message: "Auth error" });
    }
  }
}));

// 2. Mock external side-effects (Socket.IO, Notifications, Activity Logs)
vi.mock("../socket/io.js", () => ({
  emitUsersDirectoryUpdated: vi.fn(),
  emitUsersNotification: vi.fn(),
}));

vi.mock("../services/notificationService.js", () => ({
  createNotificationsForRecipients: vi.fn().mockResolvedValue([]),
}));

vi.mock("../utils/activityLogPayload.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/activityLogPayload.js")>();
  return {
    ...actual,
    logActivityForRequest: vi.fn().mockResolvedValue(true),
  };
});

// 3. Import the rest of the dependencies AFTER the mocks are established
import userRoutes from "./userRoutes.js";
import User from "../models/User.js";
import Department from "../models/Department.js";

// Construct the minimal Express app
const app = express();
app.use(express.json());
app.use("/api/users", userRoutes);

// Basic error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.status || 500).json({ success: false, message: err.message });
});

describe("User Routes (/api/users)", () => {
  const JWT_SECRET = "super-secret-test-key";
  let superadminToken: string;
  let standardUserToken: string;
  let superadminId: string;
  let standardUserId: string;
  let mockDeptId: string;

  // Helper to generate a dummy token. Our mocked authMiddleware will just decode it.
  const generateToken = (userId: string) => {
    return jwt.sign({ sub: userId, user_id: userId }, JWT_SECRET);
  };

  beforeEach(async () => {
    // Setup a mock department
    const dept = await Department.create({ department_name: "Operations" });
    mockDeptId = dept._id.toString();

    // Setup a Superadmin user
    const superadmin = await User.create({
      email: "superadmin@example.com",
      first_name: "Super",
      last_name: "Admin",
      global_role: "Superadmin",
      is_active: true,
      departments: [{ department_id: dept._id, department_role: "Head" }]
    });
    superadminId = superadmin._id.toString();
    superadminToken = generateToken(superadminId);

    // Setup a Standard user
    const standardUser = await User.create({
      email: "standard@example.com",
      first_name: "Standard",
      last_name: "User",
      global_role: "Standard_User",
      is_active: true,
      departments: [{ department_id: dept._id, department_role: "Intern" }]
    });
    standardUserId = standardUser._id.toString();
    standardUserToken = generateToken(standardUserId);
  });

  describe("GET /api/users", () => {
    it("should deny access if no token is provided (401)", async () => {
      const response = await request(app).get("/api/users");
      expect(response.status).toBe(401);
    });

    it("should deny access to a Standard User (403 Forbidden)", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${standardUserToken}`);
      
      expect(response.status).toBe(403);
    });

    it("should allow Superadmin to get all users (200)", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${superadminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("GET /api/users/:userId", () => {
    it("should get user's own profile using the 'me' param", async () => {
      const response = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${standardUserToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(standardUserId);
      expect(response.body.data.email).toBe("standard@example.com");
    });
  });

  describe("POST /api/users/whitelist", () => {
    it("should allow Superadmin to whitelist a new user (201)", async () => {
      const payload = {
        email: "new-whitelist@example.com",
        global_role: "Standard_User",
        department_role: "Intern",
        department_id: mockDeptId
      };

      const response = await request(app)
        .post("/api/users/whitelist")
        .set("Authorization", `Bearer ${superadminToken}`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe("new-whitelist@example.com");
      expect(response.body.data.is_active).toBe(false);
    });
  });

  describe("PUT /api/users/:userId", () => {
    it("should allow a user to update their own basic profile fields", async () => {
      const response = await request(app)
        .put(`/api/users/${standardUserId}`)
        .set("Authorization", `Bearer ${standardUserToken}`)
        .send({ first_name: "UpdatedName" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.first_name).toBe("UpdatedName");
    });

    it("should deny a user from updating restricted fields like global_role (403)", async () => {
      const response = await request(app)
        .put(`/api/users/${standardUserId}`)
        .set("Authorization", `Bearer ${standardUserToken}`)
        .send({ global_role: "Superadmin" });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("edit your basic profile fields");
    });
  });
});