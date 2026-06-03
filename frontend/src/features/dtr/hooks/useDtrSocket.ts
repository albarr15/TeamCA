import { useEffect } from "react";
import { initializeSocket } from "../../../utils/socketSingleton";
import { useDtrStore } from "../../../store/dtrStore";

export const useDtrSocket = (onDtrUpdated: (payload: any) => void) => {
  const syncActiveSession = useDtrStore((state) => state.syncActiveSession);

  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      const socket = await initializeSocket();
      if (!socket || !mounted) return;

      // Add DTR update listener
      const handler = (p: any) => onDtrUpdated(p);
      socket.on("dtr:updated", handler);

      // On reconnect, re-sync active session to recover clock-in state
      // after browser refresh or network interruption
      const handleReconnect = async () => {
        if (!mounted) return;
        try {
          await syncActiveSession();
        } catch (_err) {
          // Non-fatal
        }
      };

      socket.on("connect", handleReconnect);

      return () => {
        socket.off("dtr:updated", handler);
        socket.off("connect", handleReconnect);
      };
    };

    const cleanup = setupSocket();

    return () => {
      mounted = false;
      cleanup.then((fn) => fn?.());
    };
  }, [onDtrUpdated, syncActiveSession]);
};
