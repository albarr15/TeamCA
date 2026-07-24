import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";

// 1. Mock the authMiddleware to simply inject a dummy user ID
vi.mock("../middlewares/authMiddleware.js", () => ({
  authMiddleware: async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: "No token" });
    
    req.user = { user_id: "mock-intern-id" };
    next();
  }
}));

// 2. Mock the DTR Service to strictly control what it returns!
vi.mock("../services/dtrService.js", () => ({
  timeIn: vi.fn()
    .mockResolvedValueOnce({ time_in: "09:00", status: "active" }) // 1st call succeeds
    .mockRejectedValueOnce({ code: "ACTIVE_SESSION", message: "Already clocked in", activeSession: { time_in: "09:00" } }), // 2nd call fails with 409
  timeOut: vi.fn().mockResolvedValue({ time_out: "17:00", status: "completed" }),
  getActiveSession: vi.fn().mockResolvedValue({ hasActiveSession: true, time_in: "09:00" }),
  startBreak: vi.fn().mockResolvedValue({ status: "on_break" }),
  endBreak: vi.fn().mockResolvedValue({ status: "active" }),
  getHistoryWithLeaves: vi.fn().mockResolvedValue({ records: [], page: 1 }),
  getSummary: vi.fn().mockResolvedValue({ total_hours: 40 })
}));

// 3. Mock external side-effects
vi.mock("../socket/io.js", () => ({ getIo: vi.fn(), emitDtrUpdate: vi.fn() }));
vi.mock("../services/notificationService.js", () => ({ createNotificationsForRecipients: vi.fn().mockResolvedValue([]) }));

// 4. Import dependencies AFTER mocks
import dtrRoutes from "./dtrRoutes.js";

// Construct the minimal Express app
const app = express();
app.use(express.json());
app.use("/api/dtr", dtrRoutes);

// Basic error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.status || 500).json({ success: false, message: err.message });
});

describe("DTR Routes (/api/dtr)", () => {
  const dummyToken = "Bearer test-token";

  describe("Sequential Clock In/Out Flow", () => {
    it("should allow the user to clock in (POST /time-in)", async () => {
      const response = await request(app)
        .post("/api/dtr/time-in")
        .set("Authorization", dummyToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("time_in");
    });

    it("should reject a second clock in and return ACTIVE_SESSION (409)", async () => {
      const response = await request(app)
        .post("/api/dtr/time-in")
        .set("Authorization", dummyToken);
      
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("ACTIVE_SESSION");
      expect(response.body).toHaveProperty("activeSession");
    });

    it("should return the active session details (GET /active-session)", async () => {
      const response = await request(app)
        .get("/api/dtr/active-session")
        .set("Authorization", dummyToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("time_in");
    });

    it("should allow the user to start a break (POST /break-start)", async () => {
      const response = await request(app)
        .post("/api/dtr/break-start")
        .set("Authorization", dummyToken)
        .send({ breakType: "lunch" }); 
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should allow the user to end their break (POST /break-end)", async () => {
      const response = await request(app)
        .post("/api/dtr/break-end")
        .set("Authorization", dummyToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should fail to clock out if 'remarks' are missing (Zod Validation 400)", async () => {
      const response = await request(app)
        .post("/api/dtr/time-out")
        .set("Authorization", dummyToken)
        .send({ remarks: "" }); 
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Activity log is required");
    });

    it("should allow the user to clock out with remarks (POST /time-out)", async () => {
      const response = await request(app)
        .post("/api/dtr/time-out")
        .set("Authorization", dummyToken)
        .send({ remarks: "Finished my tasks for the day." });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("time_out");
    });
  });

  describe("DTR Retrieval Endpoints", () => {
    it("should fetch paginated history (GET /history)", async () => {
      const response = await request(app)
        .get("/api/dtr/history?page=1&limit=5")
        .set("Authorization", dummyToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it("should fetch the weekly summary (GET /summary/week)", async () => {
      const response = await request(app)
        .get("/api/dtr/summary/week")
        .set("Authorization", dummyToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});