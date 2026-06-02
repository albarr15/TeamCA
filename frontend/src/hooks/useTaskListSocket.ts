import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { initializeSocket } from "../utils/socketSingleton";

type NotificationPayload = {
  event_type?: string;
  eventType?: string;
  entity_type?: string;
  entityType?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

const isTaskEvent = (payload: NotificationPayload): boolean => {
  const eventType = payload?.event_type ?? payload?.eventType;
  const entityType = payload?.entity_type ?? payload?.entityType;

  if (typeof entityType === "string" && entityType === "task") {
    return true;
  }
  if (typeof eventType === "string" && eventType.startsWith("task_")) {
    return true;
  }
  return false;
};

export const useTaskListSocket = (onTaskEvent: (payload: NotificationPayload) => void) => {
  const callbackRef = useRef(onTaskEvent);
  callbackRef.current = onTaskEvent;

  useEffect(() => {
    let socket: Socket | null = null;
    let cancelled = false;

    const handler = (payload: NotificationPayload) => {
      if (isTaskEvent(payload)) {
        callbackRef.current(payload);
      }
    };

    void initializeSocket().then((s) => {
      if (cancelled || !s) return;
      socket = s;
      socket.on("notification:received", handler);
    });

    return () => {
      cancelled = true;
      if (socket) {
        socket.off("notification:received", handler);
      }
    };
  }, []);
};
