import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import bcrypt from "bcryptjs";
import authRoutes from "./authRoutes.js";
import User from "../models/User.js";
import Department from "../models/Department.js";

// Construct a minimal Express app purely for testing these routes
const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

// Basic error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.status || 500).json({ success: false, message: err.message });
});

describe("Auth Routes (/api/auth)", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "super-secret-route-key";
  });

  describe("POST /check-email", () => {
    it("should return exists: false for an unknown email", async () => {
      const response = await request(app)
        .post("/api/auth/check-email")
        .send({ email: "unknown@example.com" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ exists: false, needsSetup: false });
    });

    it("should return exists: true and needsSetup: true for an inactive user", async () => {
      await User.create({ email: "inactive@example.com", is_active: false });

      const response = await request(app)
        .post("/api/auth/check-email")
        .send({ email: "inactive@example.com" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ exists: true, needsSetup: true });
    });
  });

  describe("POST /login", () => {
    beforeEach(async () => {
      const password_hash = await bcrypt.hash("password123", 10);
      await User.create({
        email: "routeuser@example.com",
        password_hash,
        is_active: true,
        first_name: "Test",
        last_name: "User"
      });
    });

    it("should fail validation if missing required fields (validateRequest middleware)", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "routeuser@example.com" }); // Missing password

      expect(response.status).toBeGreaterThanOrEqual(400); 
      expect(response.status).toBeLessThan(500);
    });

    it("should successfully login and return a token", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "routeuser@example.com", password: "password123" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data.user.email).toBe("routeuser@example.com");
    });
  });

  describe("POST /complete-setup", () => {
    let mockDeptId: string;

    beforeEach(async () => {
      const dept = await Department.create({ department_name: "IT" });
      mockDeptId = dept._id.toString();
      await User.create({ email: "setuptest@example.com", is_active: false });
    });

    it("should setup account successfully via endpoint", async () => {
      const payload = {
        email: "setuptest@example.com",
        first_name: "New",
        last_name: "Intern",
        password: "SecureP@ss123",
        department_id: mockDeptId,
        school_university: "Test University",
        required_hours: 300
      };

      const response = await request(app)
        .post("/api/auth/complete-setup")
        .send(payload);

      if (response.status !== 200) {
        console.error("Setup failed with:", response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data.user.first_name).toBe("New");
    });
  });
});