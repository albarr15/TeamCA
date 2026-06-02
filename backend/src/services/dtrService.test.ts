import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../socket/io", () => ({
  emitUserDTRUpdated: vi.fn(),
  emitUsersLeaveUpdated: vi.fn(),
  emitUsersNotification: vi.fn(),
  emitUserNotification: vi.fn(),
  emitUsersDirectoryUpdated: vi.fn(),
  emitTaskStatusUpdated: vi.fn(),
  emitTaskCommentCreated: vi.fn(),
}));

import { endBreak, startBreak, timeIn, timeOut } from "./dtrService.js";
import DTR from "../models/DTR.js";
import Leave from "../models/Leave.js";
import { makeDepartment, makeUser } from "../__tests__/factories.js";
import { emitUserDTRUpdated } from "../socket/io.js";

const emitDTR = emitUserDTRUpdated as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  emitDTR.mockClear();
});

const setupUser = async () => {
  const dept = await makeDepartment();
  const user = await makeUser({
    departments: [{ department_id: dept._id, department_role: "Intern" }],
  });
  return { user, dept };
};

describe("dtrService — socket emits", () => {
  it("timeIn (second clock of day) emits dtr:updated with event=time-in", async () => {
    const { user, dept } = await setupUser();

    // First clock-in creates the DTR record (no emit yet — emit only on subsequent clocks)
    await timeIn(String(user._id));

    // Close the first clock so the next timeIn pushes another clock entry
    const dtr = await DTR.findOne({ userId: user._id });
    expect(dtr).not.toBeNull();
    dtr!.clocks[0].timeOut = new Date();
    await dtr!.save();

    emitDTR.mockClear();
    await timeIn(String(user._id));

    expect(emitDTR).toHaveBeenCalledTimes(1);
    const [userId, payload] = emitDTR.mock.calls[0];
    expect(userId).toBe(String(user._id));
    expect((payload as any).event).toBe("time-in");
    expect((payload as any).clocks).toBeDefined();
  });

  it("timeOut emits dtr:updated with event=time-out then totals-updated", async () => {
    const { user } = await setupUser();
    await timeIn(String(user._id));

    emitDTR.mockClear();
    await timeOut(String(user._id), "Done for the day");

    const events = emitDTR.mock.calls.map((c) => (c[1] as any).event);
    expect(events).toContain("time-out");
    expect(events).toContain("totals-updated");
  });

  it("startBreak emits dtr:updated with event=break-start", async () => {
    const { user } = await setupUser();
    await timeIn(String(user._id));

    emitDTR.mockClear();
    await startBreak(String(user._id), "lunch");

    expect(emitDTR).toHaveBeenCalledTimes(1);
    expect((emitDTR.mock.calls[0][1] as any).event).toBe("break-start");
  });

  it("endBreak emits dtr:updated with event=break-end", async () => {
    const { user } = await setupUser();
    await timeIn(String(user._id));
    await startBreak(String(user._id), "rest");

    emitDTR.mockClear();
    await endBreak(String(user._id));

    expect(emitDTR).toHaveBeenCalledTimes(1);
    expect((emitDTR.mock.calls[0][1] as any).event).toBe("break-end");
  });

  it("timeIn on an approved leave day blocks and emits dtr:updated when auto-closing open clocks", async () => {
    const { user, dept } = await setupUser();

    // Seed a DTR with an open clock for today, then approve a leave covering today.
    // Use a wide ±1 day window to remain timezone-agnostic in tests.
    const PH_OFFSET = 8 * 60 * 60 * 1000;
    const todayPH = new Date(new Date().getTime() + PH_OFFSET);
    todayPH.setHours(0, 0, 0, 0);

    await DTR.create({
      userId: user._id,
      departmentId: dept._id,
      date: todayPH,
      clocks: [{ timeIn: new Date(), status: "present" }],
      attendanceStatus: "present",
    });

    await Leave.create({
      userId: user._id,
      departmentId: dept._id,
      leaveType: "emergency",
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      duration: 1,
      reason: "Family",
      status: "approved",
      reviewHistory: [],
    });

    emitDTR.mockClear();

    await expect(timeIn(String(user._id))).rejects.toThrow(
      /cannot clock in on an approved leave day/i,
    );

    // closeOpenClocksForToday should have emitted dtr:updated
    expect(emitDTR).toHaveBeenCalledTimes(1);
    const [userId, payload] = emitDTR.mock.calls[0];
    expect(userId).toBe(String(user._id));
    expect((payload as any).event).toBe("leave-auto-close");
  });

  it("timeOut on an approved leave day blocks and emits dtr:updated when auto-closing", async () => {
    const { user, dept } = await setupUser();

    const PH_OFFSET = 8 * 60 * 60 * 1000;
    const todayPH = new Date(new Date().getTime() + PH_OFFSET);
    todayPH.setHours(0, 0, 0, 0);

    await DTR.create({
      userId: user._id,
      departmentId: dept._id,
      date: todayPH,
      clocks: [{ timeIn: new Date(), status: "present" }],
      attendanceStatus: "present",
    });

    await Leave.create({
      userId: user._id,
      departmentId: dept._id,
      leaveType: "sick",
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      duration: 1,
      reason: "Sick",
      status: "approved",
      reviewHistory: [],
    });

    emitDTR.mockClear();

    await expect(
      timeOut(String(user._id), "Done"),
    ).rejects.toThrow(/cannot clock out on an approved leave day/i);

    expect(emitDTR).toHaveBeenCalledTimes(1);
    expect((emitDTR.mock.calls[0][1] as any).event).toBe("leave-auto-close");
  });
});
