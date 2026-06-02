import { useEffect } from "react";
import { initializeSocket } from "../utils/socketSingleton";

export type UserDirectoryEventType =
  | "user_created"
  | "user_updated"
  | "user_deleted";

export interface UserDirectoryPayload {
  event_type?: UserDirectoryEventType;
  user_id?: string;
  [key: string]: unknown;
}

export const useUserDirectorySocket = (
  onDirectoryUpdated: (payload: UserDirectoryPayload) => void,
) => {
  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      const socket = await initializeSocket();
      if (!socket || !mounted) return;

      const handler = (p: UserDirectoryPayload) => onDirectoryUpdated(p ?? {});
      socket.on("user:directory-updated", handler);

      return () => {
        socket.off("user:directory-updated", handler);
      };
    };

    const cleanup = setupSocket();

    return () => {
      mounted = false;
      cleanup.then((fn) => fn?.());
    };
  }, [onDirectoryUpdated]);
};
