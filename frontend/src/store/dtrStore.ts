import { create } from "zustand";
import type { DailyTimeRecord } from "../types/dtr";
import { dtrService } from "../services/dtrService";

const getActiveClock = (records: DailyTimeRecord[]) => {
  if (!records.length) return undefined;

  // An open clock (forgotten clock-out / break) can live on a record from a
  // previous day, not just the most recent one. Scan all records — sorted
  // newest first — for the first one that still has an open clock, instead
  // of assuming it's always "today's" record.
  const sorted = records
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const record of sorted) {
    const openClock = record?.clocks?.find((clock) => clock.timeIn && !clock.timeOut);
    if (openClock) return openClock;
  }
  return undefined;
};

const syncFlagsFromRecords = (records: DailyTimeRecord[]) => {
  const activeClock = getActiveClock(records);
  const breakIsActive = Boolean(
    activeClock &&
    activeClock.breaks &&
    activeClock.breaks.length > 0 &&
    !activeClock.breaks[activeClock.breaks.length - 1].breakEnd,
  );

  return {
    clockedIn: Boolean(activeClock),
    isOnBreak: breakIsActive,
  };
};

const mergeRecordIntoState = (
  records: DailyTimeRecord[],
  nextRecord: DailyTimeRecord,
) => {
  if (!nextRecord?._id) {
    return records;
  }

  const index = records.findIndex((record) => record._id === nextRecord._id);
  if (index === -1) {
    return [nextRecord, ...records];
  }

  const merged = records.slice();
  merged[index] = nextRecord;
  return merged;
};

export interface ActiveSessionConflict {
  dtrId: string;
  clockInTime: string | Date;
  attendanceStatus?: string;
  activeBreak: { breakStart: string | Date; type: string } | null;
}

interface DtrState {
  records: DailyTimeRecord[];
  setRecords: (records: DailyTimeRecord[]) => void;
  refreshRecords: () => Promise<void>;
  clockedIn: boolean;
  setClockedIn: (v: boolean) => void;
  isOnBreak: boolean;
  setIsOnBreak: (v: boolean) => void;
  clockIn: () => Promise<void>;
  clockOut: (remarks: string) => Promise<void>;
  startBreak: (breakType?: string) => Promise<void>;
  endBreak: () => Promise<void>;
  /** Fetch and sync active session from backend (call on mount / reconnect) */
  syncActiveSession: () => Promise<void>;
  /** Non-null when the server rejects a clock-in due to an existing open session */
  activeSessionConflict: ActiveSessionConflict | null;
  clearActiveSessionConflict: () => void;
}

export const useDtrStore = create<DtrState>((set, get) => ({
  records: [],
  setRecords: (records) => {
    const flags = syncFlagsFromRecords(records);
    set({ records, ...flags });
  },
  refreshRecords: async () => {
    const records = await dtrService.getDTRRecords();
    get().setRecords(records);
  },
  clockedIn: false,
  setClockedIn: (v) => set({ clockedIn: v }),
  isOnBreak: false,
  setIsOnBreak: (v) => set({ isOnBreak: v }),

  activeSessionConflict: null,
  clearActiveSessionConflict: () => set({ activeSessionConflict: null }),

  /**
   * syncActiveSession — call on page mount or socket reconnect.
   * Hits GET /dtr/active-session and reconciles local clockedIn / isOnBreak
   * flags without requiring a full record list reload.
   */
  syncActiveSession: async () => {
    try {
      const session = await dtrService.getActiveSession();
      if (session.hasActiveSession && session.dtr) {
        set((state) => {
          const records = mergeRecordIntoState(state.records, session.dtr!);
          return { records, ...syncFlagsFromRecords(records) };
        });
      } else {
        // No active session on server — ensure local flags are cleared
        set({ clockedIn: false, isOnBreak: false });
      }
    } catch (_err) {
      // Non-fatal: silently fall back to existing state
    }
  },

  clockIn: async () => {
    try {
      // Clear any stale conflict before attempting
      set({ activeSessionConflict: null });
      const updatedRecord = await dtrService.clockIn();
      set((state) => {
        const records = mergeRecordIntoState(state.records, updatedRecord);
        return { records, ...syncFlagsFromRecords(records) };
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const body = err?.response?.data;

      // 409 = active session already exists — surface the conflict for the warning modal
      if (status === 409 && body?.code === "ACTIVE_SESSION") {
        set({ activeSessionConflict: body.activeSession ?? null });
        // Refresh records so the UI reflects the real server state
        await get().refreshRecords();
        return;
      }

      const msg = body?.message || err?.message || "";
      // Legacy: server returned 400 with "already clocked in" text
      if (
        typeof msg === "string" &&
        msg.toLowerCase().includes("already clocked in")
      ) {
        await get().refreshRecords();
        return;
      }
      // rethrow for upstream handling
      throw err;
    }

    await get().refreshRecords();
  },

  clockOut: async (remarks: string) => {
    try {
      const updatedRecord = await dtrService.clockOut(remarks);
      set((state) => {
        const records = mergeRecordIntoState(state.records, updatedRecord);
        return { records, ...syncFlagsFromRecords(records) };
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "";
      // If server says no clock-in found or last clock already timed out, refresh and sync
      if (
        typeof msg === "string" &&
        (msg.toLowerCase().includes("no clock-in") ||
          msg.toLowerCase().includes("already timed out") ||
          msg.toLowerCase().includes("last clock-in already timed out"))
      ) {
        await get().refreshRecords();
        // ensure local flag reflects no active clock
        get().setClockedIn(false);
        return;
      }

      throw err;
    }

    // on success ensure flags updated from the refreshed record list
    get().setClockedIn(false);
    await get().refreshRecords();
  },

  startBreak: async (breakType = "rest") => {
    const updatedRecord = await dtrService.startBreak(breakType);
    set((state) => {
      const records = mergeRecordIntoState(state.records, updatedRecord);
      return { records, ...syncFlagsFromRecords(records) };
    });
    await get().refreshRecords();
  },

  endBreak: async () => {
    const updatedRecord = await dtrService.endBreak();
    set((state) => {
      const records = mergeRecordIntoState(state.records, updatedRecord);
      return { records, ...syncFlagsFromRecords(records) };
    });
    await get().refreshRecords();
  },
}));