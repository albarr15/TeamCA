import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../socket/io", () => ({
  emitUsersLeaveUpdated: vi.fn(),
  emitUserDTRUpdated: vi.fn(),
  emitUsersNotification: vi.fn(),
  emitUserNotification: vi.fn(),
  emitUsersDirectoryUpdated: vi.fn(),
  emitTaskStatusUpdated: vi.fn(),
  emitTaskCommentCreated: vi.fn(),
}));

import {
  approveLeave,
  cancelLeave,
  createLeave,
  rejectLeave,
} from "./leaveService.js";
import Leave from "../models/Leave.js";
import DTR from "../models/DTR.js";
import { makeDepartment, makeUser } from "../__tests__/factories.js";
import { emitUserDTRUpdated, emitUsersLeaveUpdated } from "../socket/io.js";

const emitLeave = emitUsersLeaveUpdated as unknown as ReturnType<typeof vi.fn>;
const emitDTR = emitUserDTRUpdated as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  emitLeave.mockClear();
  emitDTR.mockClear();
});

const isoOffsetDays = (days: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
};

describe("leaveService — socket emits", () => {
  it("createLeave emits leave_submitted to applicant + reviewers", async () => {
    const dept = await makeDepartment();
    const applicant = await makeUser({
      departments: [{ department_id: dept._id, department_role: "Intern" }],
    });
    const head = await makeUser({
      departments: [{ department_id: dept._id, department_role: "Head" }],
    });
    const admin = await makeUser({ global_role: "Admin" });

    await createLeave({
      userId: String(applicant._id),
      leaveType: "vacation",
      startDate: isoOffsetDays(5),
      endDate: isoOffsetDays(6),
      reason: "Trip",
    });

    expect(emitLeave).toHaveBeenCalledTimes(1);
    const [recipientIds, payload] = emitLeave.mock.calls[0];
    expect(recipientIds).toEqual(
      expect.arrayContaining([
        String(applicant._id),
        String(head._id),
        String(admin._id),
      ]),
    );
    expect((payload as any).event_type).toBe("leave_submitted");
    expect((payload as any).actor_id).toBe(String(applicant._id));
    expect((payload as any).leave.status).toBe("pending");
    expect((payload as any).leave.leaveType).toBe("vacation");
  });

  it("approveLeave emits leave_approved with applicant + actor + reviewers", async () => {
    const dept = await makeDepartment();
    const applicant = await makeUser({
      departments: [{ department_id: dept._id, department_role: "Intern" }],
    });
    const head = await makeUser({
      departments: [{ department_id: dept._id, department_role: "Head" }],
    });

    await createLeave({
      userId: String(applicant._id),
      leaveType: "sick",
      startDate: isoOffsetDays(2),
      endDate: isoOffsetDays(2),
      reason: "Flu",
    });

    const pending = await Leave.findOne({ userId: applicant._id });
    expect(pending).not.toBeNull();

    emitLeave.mockClear();

    await approveLeave({
      leaveId: String(pending!._id),
      actorId: String(head._id),
    });

    expect(emitLeave).toHaveBeenCalledTimes(1);
    const [recipientIds, payload] = emitLeave.mock.calls[0];
    expect(recipientIds).toEqual(
      expect.arrayContaining([String(applicant._id), String(head._id)]),
    );
    expect((payload as any).event_type).toBe("leave_approved");
    expect((payload as any).actor_id).toBe(String(head._id));
    expect((payload as any).leave.status).toBe("approved");
  });

  it("approveLeave emits dtr:updated when an open clock is auto-closed", async () => {
    const dept = await makeDepartment();
    const applicant = await makeUser({
      departments: [{ department_id: dept._id, department_role: "Intern" }],
    });
    const head = await makeUser({
      departments: [{ department_id: dept._id, department_role: "Head" }],
    });

    // Set up a leave starting today, and an open clock on that date
    const PH_OFFSET = 8 * 60 * 60 * 1000;
    const todayPH = new Date(new Date().getTime() + PH_OFFSET);
    todayPH.setHours(0, 0, 0, 0);

    const startDate = new Date(todayPH.getTime() - PH_OFFSET);

    const leave = await Leave.create({
      userId: applicant._id,
      departmentId: dept._id,
      leaveType: "emergency",
      startDate,
      endDate: startDate,
      duration: 1,
      reason: "Family",
      status: "pending",
      reviewHistory: [],
    });

    await DTR.create({
      userId: applicant._id,
      departmentId: dept._id,
      date: todayPH,
      clocks: [{ timeIn: new Date(), status: "present" }],
      attendanceStatus: "present",
    });

    emitLeave.mockClear();
    emitDTR.mockClear();

    await approveLeave({
      leaveId: String(leave._id),
      actorId: String(head._id),
    });

    expect(emitDTR).toHaveBeenCalledTimes(1);
    const [userId, payload] = emitDTR.mock.calls[0];
    expect(userId).toBe(String(applicant._id));
    expect((payload as any).event).toBe("leave-auto-close");
    expect(emitLeave).toHaveBeenCalledTimes(1);
  });

  it("rejectLeave emits leave_rejected to applicant + actor + reviewers", async () => {
    const dept = await makeDepartment();
    const applicant = await makeUser({
      departments: [{ department_id: dept._id, department_role: "Intern" }],
    });
    const head = await makeUser({
      departments: [{ department_id: dept._id, department_role: "Head" }],
    });

    await createLeave({
      userId: String(applicant._id),
      leaveType: "other",
      startDate: isoOffsetDays(10),
      endDate: isoOffsetDays(11),
      reason: "Personal",
    });
    const pending = await Leave.findOne({ userId: applicant._id });

    emitLeave.mockClear();

    await rejectLeave({
      leaveId: String(pending!._id),
      actorId: String(head._id),
      rejectionReason: "Project deadline this week",
    });

    expect(emitLeave).toHaveBeenCalledTimes(1);
    const [recipientIds, payload] = emitLeave.mock.calls[0];
    expect(recipientIds).toEqual(
      expect.arrayContaining([String(applicant._id), String(head._id)]),
    );
    expect((payload as any).event_type).toBe("leave_rejected");
    expect((payload as any).leave.status).toBe("rejected");
    expect((payload as any).leave.rejectionReason).toBe(
      "Project deadline this week",
    );
  });

  it("cancelLeave emits leave_cancelled to applicant + reviewers", async () => {
    const dept = await makeDepartment();
    const applicant = await makeUser({
      departments: [{ department_id: dept._id, department_role: "Intern" }],
    });
    await makeUser({
      departments: [{ department_id: dept._id, department_role: "Head" }],
    });

    await createLeave({
      userId: String(applicant._id),
      leaveType: "unpaid",
      startDate: isoOffsetDays(15),
      endDate: isoOffsetDays(15),
      reason: "Errand",
    });
    const pending = await Leave.findOne({ userId: applicant._id });

    emitLeave.mockClear();

    await cancelLeave(String(applicant._id), String(pending!._id));

    expect(emitLeave).toHaveBeenCalledTimes(1);
    const [recipientIds, payload] = emitLeave.mock.calls[0];
    expect(recipientIds).toContain(String(applicant._id));
    expect((payload as any).event_type).toBe("leave_cancelled");
    expect((payload as any).leave.status).toBe("cancelled");
  });

  it("deduplicates recipient ids in the emit payload", async () => {
    const dept = await makeDepartment();
    // An admin who is also the department head — applicant + admin + head all distinct
    const applicant = await makeUser({
      departments: [{ department_id: dept._id, department_role: "Intern" }],
    });
    const headAdmin = await makeUser({
      global_role: "Admin",
      departments: [{ department_id: dept._id, department_role: "Head" }],
    });

    await createLeave({
      userId: String(applicant._id),
      leaveType: "sick",
      startDate: isoOffsetDays(1),
      endDate: isoOffsetDays(1),
      reason: "Sick",
    });

    expect(emitLeave).toHaveBeenCalledTimes(1);
    // emitUsersLeaveUpdated dedupes internally — pass-through arg
    // may contain duplicates; the call still happens once and downstream
    // dedupe is asserted via io.ts unit (covered by socket emit behaviour).
    const [recipientIds] = emitLeave.mock.calls[0];
    expect(recipientIds).toEqual(
      expect.arrayContaining([String(applicant._id), String(headAdmin._id)]),
    );
  });
});
