import React, { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { CompactDTRSummary } from "../../components/compactDTRSummary";
import DTRHistoryTable from "./DTRHistoryTable";
import DTRRecordDetailModal from "./DTRRecordDetailModal";
import { useDtrStore } from "../../store/dtrStore";
import { dtrService } from "../../services/dtrService";
import type { DailyTimeRecord, DTRHistoryItem } from "../../types/dtr";
import { ReminderSettings } from "../../components/ReminderSettings";
import { ExportOptions } from "../../components/ExportOptions";
import { TimeAdjustmentForm } from "../../components/TimeAdjustmentForm";
import { TimeAdjustmentReview } from "../../components/TimeAdjustmentReview";
import {
  ClockCardSkeleton,
  ProgressBarSkeleton,
  TableHeaderSkeleton,
  TableRowSkeleton,
  WidgetSkeleton,
} from "../../components/ui/Skeleton";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { useDtrSocket } from "./hooks/useDtrSocket";

export default function DTRPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const records = useDtrStore((state) => state.records);
  const clockedIn = useDtrStore((state) => state.clockedIn);
  const isOnBreak = useDtrStore((state) => state.isOnBreak);
  const refreshRecords = useDtrStore((state) => state.refreshRecords);
  const clockIn = useDtrStore((state) => state.clockIn);
  const clockOut = useDtrStore((state) => state.clockOut);
  const startBreak = useDtrStore((state) => state.startBreak);
  const endBreak = useDtrStore((state) => state.endBreak);
  const syncActiveSession = useDtrStore((state) => state.syncActiveSession);
  const activeSessionConflict = useDtrStore((state) => state.activeSessionConflict);
  const clearActiveSessionConflict = useDtrStore((state) => state.clearActiveSessionConflict);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [activityLog, setActivityLog] = useState("");
  const [activityLogError, setActivityLogError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showActivityWarning, setShowActivityWarning] = useState(false);

  const MIN_ACTIVITY_LENGTH = 20;
  const [showExportModal, setShowExportModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentDate, setAdjustmentDate] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Break state
  const [breakDuration, setBreakDuration] = useState(0);
  const [breakLoading, setBreakLoading] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);

  // Re-render tick so the Hours Worked timer advances while clocked in
  const [, setNowTick] = useState(0);

  // History state — DTRHistoryItem union supports both DTR rows and leave rows
  const [historyRecords, setHistoryRecords] = useState<DTRHistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Detail modal state
  const [selectedRecord, setSelectedRecord] = useState<DailyTimeRecord | null>(null);
  const [historyFilters, setHistoryFilters] = useState({
    status: 'all',
    sort_by: 'date_desc',
  });

  const activeClock = React.useMemo(() => {
    if (!records.length) return undefined;

    const today = records.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];

    return today?.clocks?.find((c) => c.timeIn && !c.timeOut);
  }, [records]);

  const clockInTime = activeClock?.timeIn ? new Date(activeClock.timeIn) : null;
  const isClockedIn = Boolean(activeClock);
  const isBreakActive = isClockedIn && isOnBreak;

  const formatMinutes = (minutes: number) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const totalMinutesWorked = clockInTime
    ? Math.max(
        0,
        Math.floor((Date.now() - clockInTime.getTime()) / 60000) -
          (isBreakActive ? breakDuration : 0),
      )
    : 0;

  const syncBreakTimer = React.useCallback(() => {
    const activeBreak = activeClock?.breaks?.[activeClock.breaks.length - 1];
    if (activeBreak?.breakStart && !activeBreak.breakEnd) {
      setBreakStartTime(new Date(activeBreak.breakStart));
      setBreakDuration(
        Math.floor((Date.now() - new Date(activeBreak.breakStart).getTime()) / 60000),
      );
      return;
    }
    setBreakStartTime(null);
    setBreakDuration(0);
  }, [activeClock]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const fetchDTR = async () => {
      try {
        // Refresh full record list and also sync active session state
        await Promise.all([refreshRecords(), syncActiveSession()]);
      } catch (err) {
        // handled
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchDTR();
    }
  }, [isAuthenticated]);

  React.useEffect(() => {
    syncBreakTimer();
  }, [syncBreakTimer]);

  const fetchHistory = React.useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setHistoryLoading(true);
      const result = await dtrService.getHistory(historyPage, historyLimit, historyFilters);
      // result.items contains both DailyTimeRecord and LeaveRecord entries
      setHistoryRecords(result.items as DTRHistoryItem[]);
      setHistoryTotal(result.total);
      setHistoryTotalPages(result.total_pages);
    } catch (err) {
      // handled
    } finally {
      setHistoryLoading(false);
    }
  }, [isAuthenticated, historyPage, historyLimit, historyFilters]);

  const handleDtrSocketUpdate = React.useCallback(
    async (_payload: any) => {
      try {
        await refreshRecords();
        await fetchHistory();
      } catch (err) {
        console.error("Failed to refresh DTR data after socket update.", err);
      }
    },
    [refreshRecords, fetchHistory],
  );

  useDtrSocket(handleDtrSocketUpdate);

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  React.useEffect(() => {
    if (!clockedIn || !breakStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - breakStartTime.getTime()) / 60000);
      setBreakDuration(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [clockedIn, breakStartTime]);

  React.useEffect(() => {
    if (!isClockedIn) return;

    const interval = setInterval(() => {
      setNowTick((tick) => tick + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isClockedIn]);

  if (!mounted) return null;

  if (!isAuthenticated) {
    window.location.replace("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-2">
            <div className="h-8 w-72 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-96 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-200" />
          </div>
          <div className="w-full flex-shrink-0 lg:w-80">
            <ClockCardSkeleton />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <WidgetSkeleton lines={4} />
          <WidgetSkeleton lines={4} />
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            <ProgressBarSkeleton />
          </div>
          <TableHeaderSkeleton columnCount={6} />
          {Array.from({ length: 6 }).map((_, index) => (
            <TableRowSkeleton key={index} columnCount={6} />
          ))}
        </div>
      </div>
    );
  }

  const handleClockIn = async () => {
    try {
      setActionError(null);
      await clockIn();
      // activeSessionConflict will be set in the store if 409 conflict is received
      if (!useDtrStore.getState().activeSessionConflict) {
        window.location.reload();
      }
    } catch (err) {
      const message = (err as any)?.response?.data?.message ||
        (err instanceof Error ? err.message : "Failed to clock in");
      setActionError(message);
    }
  };

  const handleOpenClockOut = () => {
    setActivityLogError(null);
    setShowActivityWarning(false);
    setOpen(true);
  };

  const doClockOut = async () => {
    const trimmed = activityLog.trim();
    try {
      setSubmitting(true);
      setActionError(null);
      setActivityLogError(null);

      await clockOut(trimmed);

      setActivityLog("");
      setOpen(false);
      setShowActivityWarning(false);
      window.location.reload();
    } catch (err) {
      const message = (err as any)?.response?.data?.message ||
        (err instanceof Error ? err.message : "Failed to clock out");
      setActivityLogError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitClockOut = async () => {
    const trimmed = activityLog.trim();

    if (!trimmed) {
      setActivityLogError("Please describe what you worked on today before clocking out.");
      return;
    }

    if (trimmed.length < MIN_ACTIVITY_LENGTH) {
      // Show warning confirmation modal instead of hard blocking
      setShowActivityWarning(true);
      return;
    }

    await doClockOut();
  };

  const handleStartBreak = async () => {
    try {
      setBreakLoading(true);
      setActionError(null);
      await startBreak();
    } catch (err) {
      const message = (err as any)?.response?.data?.message ||
        (err instanceof Error ? err.message : "Failed to start break");
      setActionError(message);
    } finally {
      setBreakLoading(false);
    }
  };

  const handleEndBreak = async () => {
    try {
      setBreakLoading(true);
      setActionError(null);
      await endBreak();
    } catch (err) {
      const message = (err as any)?.response?.data?.message ||
        (err instanceof Error ? err.message : "Failed to end break");
      setActionError(message);
    } finally {
      setBreakLoading(false);
    }
  };

  const handleHistoryPageChange = (newPage: number) => {
    setHistoryPage(newPage);
  };

  const handleHistoryFilterChange = (filters: any) => {
    setHistoryFilters((prev) => ({ ...prev, ...filters }));
    setHistoryPage(1);
  };

  const handleHistorySortChange = (sortBy: string) => {
    setHistoryFilters((prev) => ({ ...prev, sort_by: sortBy }));
    setHistoryPage(1);
  };

  const handleHistoryRowClick = (record: DailyTimeRecord) => {
    setSelectedRecord(record);
  };

  const handleHistoryEditClick = (record: DailyTimeRecord) => {
    const dateValue = record?.date ? new Date(record.date).toISOString().split("T")[0] : "";
    setAdjustmentDate(dateValue || null);
    setShowAdjustmentModal(true);
  };

  const handleDownloadHistory = () => {
    setShowExportModal(true);
  };

  // Handler when user dismisses the active session conflict modal
  // by choosing to clock out of the existing session first
  const handleGoToClockOut = () => {
    clearActiveSessionConflict();
    handleOpenClockOut();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">Daily Time Record</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your attendance, hours, and view full history
          </p>
          {actionError && (
            <div className="mt-3 rounded-xl border border-red-200/80 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </div>
          )}
        </div>

        <div className="w-full lg:w-80 flex-shrink-0">
          <Card className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Hours Worked
                </p>
                <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
                  {formatMinutes(totalMinutesWorked)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Status
                </p>
                <p className="mt-1.5 text-sm font-semibold text-slate-700">
                  {isBreakActive ? "On Break" : isClockedIn ? "Clocked In" : "Not Clocked In"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {!isClockedIn ? (
                <Button onClick={handleClockIn} className="w-full">
                  Clock In
                </Button>
              ) : (
                <Button onClick={handleOpenClockOut} variant="danger" className="w-full">
                  Clock Out
                </Button>
              )}

              {isClockedIn && (
                <Button
                  onClick={() => { isBreakActive ? handleEndBreak() : handleStartBreak(); }}
                  variant="secondary"
                  className="w-full"
                  disabled={breakLoading}
                >
                  {isBreakActive ? "End Break" : "Take Break"}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {user?.user_id && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4">
            <CompactDTRSummary userId={user.user_id} period="week" />
          </Card>
          <Card className="p-4">
            <CompactDTRSummary userId={user.user_id} period="month" />
          </Card>
        </div>
      )}

      <Card className="p-0 overflow-hidden bg-transparent">
        <DTRHistoryTable
          records={historyRecords}
          page={historyPage}
          limit={historyLimit}
          total={historyTotal}
          total_pages={historyTotalPages}
          isLoading={historyLoading}
          onPageChange={handleHistoryPageChange}
          onRowClick={handleHistoryRowClick}
          onEditClick={handleHistoryEditClick}
          onFilterChange={handleHistoryFilterChange}
          onSortChange={handleHistorySortChange}
          onDownload={handleDownloadHistory}
          onRemind={() => setShowReminderModal(true)}
        />
      </Card>

      {/* ACTIVE SESSION CONFLICT MODAL */}
      <Dialog
        open={Boolean(activeSessionConflict)}
        onOpenChange={(v) => { if (!v) clearActiveSessionConflict(); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Active Session Detected</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold mb-1">You're already clocked in</p>
              <p>
                You have an active clock-in session that hasn't been closed. You must clock out
                before starting a new session.
              </p>
            </div>

            {activeSessionConflict?.clockInTime && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Clocked in at</span>
                  <span className="font-medium tabular-nums">
                    {formatTime(activeSessionConflict.clockInTime)}
                  </span>
                </div>
                {activeSessionConflict.activeBreak && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Break started at</span>
                    <span className="font-medium tabular-nums">
                      {formatTime(activeSessionConflict.activeBreak.breakStart)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => clearActiveSessionConflict()}
              >
                Dismiss
              </Button>
              <Button
                variant="danger"
                onClick={handleGoToClockOut}
              >
                Clock Out Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CLOCK OUT MODAL */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setShowActivityWarning(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clock Out</DialogTitle>
          </DialogHeader>

          {showActivityWarning ? (
            /* ── Confirmation: activity log is too short ── */
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold mb-1">Activity log is too brief</p>
                <p>
                  Your activity log is very short ({activityLog.trim().length} characters).
                  A detailed log helps your supervisors track your work accurately.
                </p>
              </div>
              <p className="text-sm text-slate-600">
                Would you like to go back and add more detail, or clock out anyway?
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowActivityWarning(false)}
                  disabled={submitting}
                >
                  Add More Detail
                </Button>
                <Button
                  onClick={doClockOut}
                  disabled={submitting}
                  variant="danger"
                >
                  {submitting ? "Submitting..." : "Clock Out Anyway"}
                </Button>
              </div>
            </div>
          ) : (
            /* ── Activity log form ── */
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                What did you accomplish today? A brief activity log is required before clocking out.
              </p>
              {activityLogError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {activityLogError}
                </div>
              )}
              <div className="space-y-1">
                <textarea
                  value={activityLog}
                  onChange={(e) => {
                    setActivityLog(e.target.value);
                    if (activityLogError) setActivityLogError(null);
                  }}
                  placeholder="e.g. Completed the dashboard UI redesign, fixed 3 reported bugs in the login flow, attended team standup..."
                  className="w-full border rounded-md p-2 text-sm min-h-[120px] resize-y"
                  maxLength={500}
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>
                    {activityLog.trim().length < MIN_ACTIVITY_LENGTH && activityLog.trim().length > 0 && (
                      <span className="text-amber-500">
                        {MIN_ACTIVITY_LENGTH - activityLog.trim().length} more characters recommended
                      </span>
                    )}
                  </span>
                  <span>{activityLog.length}/500</span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitClockOut}
                  disabled={!activityLog.trim() || submitting}
                  variant="danger"
                >
                  {submitting ? "Submitting..." : "Submit & Clock Out"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* REMINDER MODAL */}
      <Dialog open={showReminderModal} onOpenChange={setShowReminderModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>DTR Reminders</DialogTitle>
          </DialogHeader>
          <ReminderSettings />
        </DialogContent>
      </Dialog>

      {/* EXPORT MODAL */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Reports & Export</DialogTitle>
          </DialogHeader>
          <ExportOptions />
        </DialogContent>
      </Dialog>

      {/* TIME ADJUSTMENT MODAL */}
      <Dialog open={showAdjustmentModal} onOpenChange={setShowAdjustmentModal}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Time Adjustment Request</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TimeAdjustmentForm
              initialDate={adjustmentDate || undefined}
              onSubmitSuccess={() => setShowAdjustmentModal(false)}
            />
            {(user?.global_role === "Admin" ||
              user?.global_role === "Superadmin" ||
              user?.departments?.some((d) => d.department_role === "Head")) ? (
              <TimeAdjustmentReview />
            ) : (
              <Card className="p-6">
                <h2 className="text-lg font-bold mb-4">My Requests</h2>
                <p className="text-gray-500">
                  View your submitted adjustment requests and their approval status here.
                </p>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DTR RECORD DETAIL MODAL */}
      <DTRRecordDetailModal
        record={selectedRecord}
        open={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  );
}
