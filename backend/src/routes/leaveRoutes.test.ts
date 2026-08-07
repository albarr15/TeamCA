import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";

// 1. Mock the auth middleware
vi.mock("../middlewares/authMiddleware.js", async () => {
  return {
    authMiddleware: async (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ success: false, message: "No token" });
      
      const token = authHeader.split(" ")[1];
      const jwtLib = await import("jsonwebtoken");
      const decoded = jwtLib.default.decode(token) as any;
      
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
    }
  };
});

// 2. Mock external side-effects
vi.mock("../socket/io.js", () => ({
  getIo: vi.fn(),
  emitUsersNotification: vi.fn(),
  emitLeaveRequestUpdated: vi.fn(),
}));

vi.mock("../services/notificationService.js", () => ({
  createNotificationsForRecipients: vi.fn().mockResolvedValue([]),
  createNotification: vi.fn().mockResolvedValue({}),
}));

vi.mock("../utils/activityLogPayload.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/activityLogPayload.js")>();
  return {
    ...actual,
    logActivityForRequest: vi.fn().mockResolvedValue(true),
  };
});

// 3. Import dependencies
import leaveRoutes from "./leaveRoutes.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import InternProfile from "../models/InternProfile.js";

const app = express();
app.use(express.json());
app.use("/api/leave", leaveRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.status || 500).json({ success: false, message: err.message });
});

describe("Leave Routes (/api/leave)", () => {
  const JWT_SECRET = "super-secret-leave-key";
  let headToken: string;
  let internToken: string;
  let headId: string;
  let internId: string;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    
    // FREEZE TIME: Force the system clock to a Monday
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-12T09:00:00.000Z")); 
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  const generateToken = (userId: string) => {
    return jwt.sign({ sub: userId, user_id: userId }, JWT_SECRET);
  };

  beforeEach(async () => {
    const dept = await Department.create({ department_name: "Engineering" });

    // Setup a Department Head
    const head = await User.create({
      email: "head.leave@example.com",
      first_name: "Department",
      last_name: "Head",
      global_role: "Admin",
      is_active: true,
      departments: [{ department_id: dept._id, department_role: "Head" }]
    });
    headId = head._id.toString();
    headToken = generateToken(headId);

    // Setup an Intern
    const intern = await User.create({
      email: "intern.leave@example.com",
      first_name: "Tired",
      last_name: "Intern",
      global_role: "Standard_User",
      is_active: true,
      departments: [{ department_id: dept._id, department_role: "Intern" }]
    });
    internId = intern._id.toString();
    internToken = generateToken(internId);

    // Give the intern a profile in case the Leave service requires balances
    await InternProfile.create({
      user_id: intern._id,
      school_university: "Test University",
      required_hours: 400,
      rendered_hours_total: 0,
      days_worked: 0
    });
  });

  describe("Applicant Flow (Creation & Cancellation)", () => {
    it("should allow an intern to file, fetch, and cancel their own leave", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1); 
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2); 

      const payload = {
        leaveType: "sick", 
        startDate: tomorrow.toISOString(), 
        endDate: dayAfter.toISOString(),   
        reason: "Feeling unwell"
      };

      const createRes = await request(app)
        .post("/api/leave")
        .set("Authorization", `Bearer ${internToken}`)
        .send(payload);
      
      expect(createRes.status).toBe(201);
      
      const leaveId = String(createRes.body.data._id);

      const fetchRes = await request(app)
        .get("/api/leave/me")
        .set("Authorization", `Bearer ${internToken}`);
      
      expect(fetchRes.status).toBe(200);

      const cancelRes = await request(app)
        .patch(`/api/leave/${leaveId}/cancel`)
        .set("Authorization", `Bearer ${internToken}`);
      
      expect(cancelRes.status).toBe(200);
    });
  });

  describe("Reviewer Flow & RBAC", () => {
    it("should enforce RBAC and allow a Head to review pending leaves", async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7); 
      
      const createRes = await request(app)
        .post("/api/leave")
        .set("Authorization", `Bearer ${internToken}`)
        .send({
          leaveType: "vacation",
          startDate: nextWeek.toISOString(), 
          endDate: nextWeek.toISOString(),   
          reason: "Family trip"
        });
      
      const leaveId = String(createRes.body.data._id);

      const internPendingRes = await request(app)
        .get("/api/leave/pending")
        .set("Authorization", `Bearer ${internToken}`);
      
      expect(internPendingRes.status).toBe(403);

      const headPendingRes = await request(app)
        .get("/api/leave/pending")
        .set("Authorization", `Bearer ${headToken}`);
      
      expect(headPendingRes.status).toBe(200);

      const badRejectRes = await request(app)
        .patch(`/api/leave/${leaveId}/approve`)
        .set("Authorization", `Bearer ${headToken}`)
        .send({ status: "rejected" }); 
      
      expect(badRejectRes.status).toBe(400);

      // THE FAILING STEP
      const approveRes = await request(app)
        .patch(`/api/leave/${leaveId}/approve`)
        .set("Authorization", `Bearer ${headToken}`)
        .send({ status: "approved" });
      
      if (approveRes.status !== 200) {
        console.error("Leave approval 500 Error:", JSON.stringify(approveRes.body, null, 2));
      }
      
      expect(approveRes.status).toBe(200);
    });
  });
});