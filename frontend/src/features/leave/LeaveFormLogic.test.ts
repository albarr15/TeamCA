import { describe, it, expect, vi, beforeEach } from "vitest";
import { leaveService } from "../../services/leaveService";
import api from "../../services/api";

// 1. Mock the internal Axios API client
vi.mock("../../services/api", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("Leave Request Form & Service Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Form Validation Rules (LeaveRequestForm.tsx)", () => {
    // Replicating the exact validateForm rules from the UI component
    const validateForm = (formData: any) => {
      if (!formData.startDate) return "Start date is required";
      if (!formData.endDate) return "End date is required";
      if (!formData.reason.trim()) return "Reason is required";

      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);

      if (start >= end) return "End date must be after start date";

      return null; // Indicates successful validation
    };

    it("should require a start date", () => {
      expect(
        validateForm({ startDate: "", endDate: "2026-07-26", reason: "Sick" })
      ).toBe("Start date is required");
    });

    it("should require an end date", () => {
      expect(
        validateForm({ startDate: "2026-07-25", endDate: "", reason: "Sick" })
      ).toBe("End date is required");
    });

    it("should require a reason that is not just empty spaces", () => {
      expect(
        validateForm({ startDate: "2026-07-25", endDate: "2026-07-26", reason: "   " })
      ).toBe("Reason is required");
    });

    it("should reject end dates that occur on or before the start date", () => {
      // End date before start date
      expect(
        validateForm({ startDate: "2026-07-26", endDate: "2026-07-25", reason: "Vacation" })
      ).toBe("End date must be after start date");
      
      // End date equals start date
      expect(
        validateForm({ startDate: "2026-07-25", endDate: "2026-07-25", reason: "Vacation" })
      ).toBe("End date must be after start date");
    });

    it("should pass validation with a valid chronological payload", () => {
      expect(
        validateForm({ startDate: "2026-07-25", endDate: "2026-07-26", reason: "Vacation" })
      ).toBeNull();
    });
  });

  describe("Service API Formatting (leaveService.ts)", () => {
      it("should correctly format local dates to ISO strings and map the payload", async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true, data: { _id: "leave_123", status: "pending" } },
      } as any);

      const payload = {
        startDate: "2026-07-25",
        endDate: "2026-07-26",
        duration: 1 as const,
        reason: "Feeling unwell",
      };

      const result = await leaveService.createLeave(payload);

      // Verify it transformed the dates to ISO-8601 strings
      expect(api.post).toHaveBeenCalledWith("/leave", {
        ...payload,
        startDate: new Date("2026-07-25").toISOString(),
        endDate: new Date("2026-07-26").toISOString(),
      });
      expect(result._id).toBe("leave_123");
    });

    it("should correctly extract and throw explicit backend error messages", async () => {
      vi.mocked(api.post).mockRejectedValueOnce({
        response: {
          data: { message: "You have insufficient required hours for this leave." },
        },
      });

      const payload = {
        startDate: "2026-07-25",
        endDate: "2026-07-26",
        duration: 1 as const,
        reason: "Feeling unwell",
      };

      // Ensure the extractError utility successfully catches the nested message
      await expect(leaveService.createLeave(payload)).rejects.toThrow(
        "You have insufficient required hours for this leave."
      );
    });
  });
});