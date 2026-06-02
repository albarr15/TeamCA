import { useEffect } from "react";
import { initializeSocket } from "../../../utils/socketSingleton";
import type { ILeave } from "../../../types/leave";

export type LeaveSocketEventType =
  | "leave_submitted"
  | "leave_approved"
  | "leave_rejected"
  | "leave_cancelled";

export interface LeaveSocketPayload {
  event_type: LeaveSocketEventType;
  leave: ILeave;
  actor_id: string;
  updated_at: string;
}

export const useLeaveSocket = (
  onLeaveUpdated: (payload: LeaveSocketPayload) => void,
) => {
  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      const socket = await initializeSocket();
      if (!socket || !mounted) return;

      const handler = (p: LeaveSocketPayload) => onLeaveUpdated(p);
      socket.on("leave:updated", handler);

      return () => {
        socket.off("leave:updated", handler);
      };
    };

    const cleanup = setupSocket();

    return () => {
      mounted = false;
      cleanup.then((fn) => fn?.());
    };
  }, [onLeaveUpdated]);
};
