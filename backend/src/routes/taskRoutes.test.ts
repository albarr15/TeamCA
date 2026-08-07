import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";

// 1. Mock the auth middleware
vi.mock("../middlewares/auth.js", async () => {
  return {
    default: async (req: any, res: any, next: any) => {
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

// 2. Mock requestLock
vi.mock("../middlewares/requestLock.js", () => ({
  requestLock: (req: any, res: any, next: any) => next()
}));

// 3. Mock side-effects
vi.mock("../socket/io.js", () => ({
  getIo: vi.fn(),
  emitTaskCommentCreated: vi.fn(),
  emitTaskStatusUpdated: vi.fn(),
  emitUsersNotification: vi.fn(),
}));

vi.mock("../services/notificationService.js", () => ({
  createNotificationsForRecipients: vi.fn().mockResolvedValue([]),
}));

vi.mock("../services/deadlineService.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/deadlineService.js")>();
  return {
    ...actual,
    emitDeadlineNotificationsForTask: vi.fn().mockResolvedValue(true),
  };
});

vi.mock("../utils/activityLogPayload.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/activityLogPayload.js")>();
  return {
    ...actual,
    logActivityForRequest: vi.fn().mockResolvedValue(true),
  };
});

// 4. Import dependencies
import taskRoutes from "./taskRoutes.js";
import User from "../models/User.js";
import Department from "../models/Department.js";

const app = express();
app.use(express.json());
app.use("/api/tasks", taskRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.status || 500).json({ success: false, message: err.message });
});

describe("Task Routes (/api/tasks)", () => {
  const JWT_SECRET = "super-secret-task-key";
  let adminToken: string;
  let internToken: string;
  let adminId: string;
  let internId: string;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  const generateToken = (userId: string) => {
    return jwt.sign({ sub: userId, user_id: userId }, JWT_SECRET);
  };

  beforeEach(async () => {
    const dept = await Department.create({ department_name: "Engineering" });

    const admin = await User.create({
      email: "admin.tasks@example.com",
      first_name: "Task",
      last_name: "Manager",
      global_role: "Admin",
      is_active: true,
      departments: [{ department_id: dept._id, department_role: "Supervisor" }]
    });
    adminId = admin._id.toString();
    adminToken = generateToken(adminId);

    const intern = await User.create({
      email: "intern.tasks@example.com",
      first_name: "Task",
      last_name: "Worker",
      global_role: "Standard_User",
      is_active: true,
      departments: [{ department_id: dept._id, department_role: "Intern" }]
    });
    internId = intern._id.toString();
    internToken = generateToken(internId);
  });

  describe("Task Lifecycle Flow", () => {
    // We group all sequential actions into ONE test block to survive the afterEach DB wipe
    it("should complete the full task lifecycle (Create -> List -> Fetch -> Link -> Status)", async () => {
      // 1. CREATE TASK (Admin)
      const payload = {
        title: "Test Integration Task",
        description: "Verify task creation routes.",
        priority: "High",
        deadline: new Date(Date.now() + 86400000).toISOString(),
        assigned_to: [internId]
      };

      const createRes = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(payload);
      
      expect(createRes.status).toBe(201);
      
      // Extract ID safely
      const createdTask = createRes.body.data.task || createRes.body.data;
      const taskId = createdTask.task_id || createdTask._id;
      expect(taskId).toBeDefined();

      // 2. LIST TASKS (Intern)
      const listRes = await request(app)
        .get("/api/tasks?page=1&limit=10")
        .set("Authorization", `Bearer ${internToken}`);
      
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.items.length).toBeGreaterThan(0);

      // 3. GET TASK DETAILS (Intern)
      const detailRes = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${internToken}`);
      
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.title).toBe("Test Integration Task");

      // 4. ADD WORK LINK (Intern)
      const linkRes = await request(app)
        .post(`/api/tasks/${taskId}/work-links`)
        .set("Authorization", `Bearer ${internToken}`)
        .send({ url: "https://github.com/PR-123", label: "Initial PR" });
      
      expect(linkRes.status).toBe(201);

      // 5. UPDATE STATUS (Intern)
      const statusRes = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set("Authorization", `Bearer ${internToken}`)
        .send({ status: "In Progress" });
      
      expect(statusRes.status).toBe(200);
    });
  });

  describe("Task Analytics (RBAC Checks)", () => {
    it("should deny Analytics access to a Standard User (GET /analytics)", async () => {
      const response = await request(app)
        .get("/api/tasks/analytics")
        .set("Authorization", `Bearer ${internToken}`);
      
      expect(response.status).toBe(403); 
    });

    it("should allow an Admin to access Analytics (GET /analytics)", async () => {
      const response = await request(app)
        .get("/api/tasks/analytics")
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty("completionMetrics");
    });
  });
});