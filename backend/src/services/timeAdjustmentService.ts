import TimeAdjustmentRequest from "../models/TimeAdjustmentRequest.js";
import DTR from "../models/DTR.js";
import { emitUserDTRUpdated } from "../socket/io.js";
import { updateDTRTotals } from "./dtrService.js";

export const timeAdjustmentService = {
  async submitRequest(
    userId: string,
    dtrDate: Date,
    adjustmentType: "time_in" | "time_out" | "manual_entry" | "leave",
    requestedValue: string,
    reason: string,
    originalValue?: string,
  ) {
    // Find the DTR record for the given date
    const startOfDay = new Date(dtrDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(dtrDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dtrRecord = await DTR.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (!dtrRecord) {
      throw new Error("DTR record not found for the specified date");
    }

    const adjustment = await TimeAdjustmentRequest.create({
      userId,
      dtrId: dtrRecord._id,
      dtrDate,
      adjustmentType,
      requestedValue,
      reason,
      originalValue,
      status: "pending",
    });

    emitUserDTRUpdated(userId, {
      type: "adjustment_request_created",
      adjustmentId: adjustment._id,
      message: "Your time adjustment request has been submitted",
    });

    return adjustment;
  },

  async getUserRequests(userId: string, status?: string) {
    const query: any = { userId };
    if (status) query.status = status;

    const requests = await TimeAdjustmentRequest.find(query)
      .populate("userId", "first_name last_name email")
      .populate("dtrId")
      .sort({ createdAt: -1 });

    return requests;
  },

  async getPendingRequests(departmentId?: string) {
    const query: any = { status: "pending" };

    let requests = await TimeAdjustmentRequest.find(query)
      .populate("userId", "first_name last_name email")
      .populate("dtrId")
      .sort({ createdAt: -1 });

    if (departmentId) {
      requests = requests.filter(
        (req: any) => req.dtrId?.departmentId?.toString() === departmentId,
      );
    }

    return requests;
  },

  async approveRequest(
    requestId: string,
    reviewedBy: string,
    reviewNotes?: string,
  ) {
    const request = await TimeAdjustmentRequest.findByIdAndUpdate(
      requestId,
      {
        status: "approved",
        reviewedBy,
        reviewNotes,
        reviewedAt: new Date(),
      },
      { new: true },
    );

    if (!request) {
      throw new Error("Request not found");
    }

    // Apply the approved value to the actual DTR record and recalculate totals
    const dtr = await DTR.findById(request.dtrId);
    if (dtr && dtr.clocks.length > 0) {
      const lastClock = dtr.clocks[dtr.clocks.length - 1];
      const adjustedDate = new Date(request.requestedValue);

      if (request.adjustmentType === "time_in") {
        lastClock.timeIn = adjustedDate;
      } else if (request.adjustmentType === "time_out") {
        lastClock.timeOut = adjustedDate;
      } else if (request.adjustmentType === "manual_entry") {
        // requestedValue is expected as "HH:MM-HH:MM" (timeIn-timeOut)
        const [inStr, outStr] = request.requestedValue.split("-");
        if (inStr && outStr) {
          const base = new Date(dtr.date);
          const [inH, inM] = inStr.split(":").map(Number);
          const [outH, outM] = outStr.split(":").map(Number);
          lastClock.timeIn = new Date(base.setHours(inH, inM, 0, 0));
          const outBase = new Date(dtr.date);
          lastClock.timeOut = new Date(outBase.setHours(outH, outM, 0, 0));
        }
      }

      await dtr.save();
      // Recalculate totals and sync intern rendered hours
      await updateDTRTotals(dtr._id.toString());
    }

    // Emit notification to user
    emitUserDTRUpdated(request.userId.toString(), {
      type: "adjustment_approved",
      adjustmentId: request._id,
      message: "Your time adjustment request has been approved",
    });

    return request;
  },

  async rejectRequest(
    requestId: string,
    reviewedBy: string,
    reviewNotes: string,
  ) {
    const request = await TimeAdjustmentRequest.findByIdAndUpdate(
      requestId,
      {
        status: "rejected",
        reviewedBy,
        reviewNotes,
        reviewedAt: new Date(),
      },
      { new: true },
    );

    if (!request) {
      throw new Error("Request not found");
    }

    emitUserDTRUpdated(request.userId.toString(), {
      type: "adjustment_rejected",
      adjustmentId: request._id,
      message: "Your time adjustment request has been rejected",
      reason: reviewNotes,
    });

    return request;
  },

  async getRequest(requestId: string) {
    const request = await TimeAdjustmentRequest.findById(requestId)
      .populate("userId", "first_name last_name email")
      .populate("dtrId")
      .populate("reviewedBy", "first_name last_name email");

    return request;
  },
};