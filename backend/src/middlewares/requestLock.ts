// backend/src/middlewares/requestLock.ts
// Lightweight in-process debounce middleware that blocks identical mutating
// requests (same user + method + URL + body) arriving within LOCK_WINDOW_MS.
// This is the Layer 3 guard against rapid frontend double-click submissions.
//
// NOTE: Because this uses a module-scoped Map it is effective only within a
// single server process. Cross-instance protection is provided by the Layer 2
// DB-level deduplication in notificationService.ts.

import type { NextFunction, Request, Response } from "express";

const LOCK_WINDOW_MS = 3_000; // 3 seconds

// Maps a composite key → timestamp (ms) of the last accepted request.
const activeLocks = new Map<string, number>();

const buildLockKey = (req: Request): string => {
  const userId = (req as any).user?.user_id ?? "anon";
  const body = JSON.stringify(req.body ?? {});
  return `${userId}:${req.method}:${req.originalUrl}:${body}`;
};

export const requestLock = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const key = buildLockKey(req);
  const now = Date.now();
  const lastSeen = activeLocks.get(key);

  if (lastSeen !== undefined && now - lastSeen < LOCK_WINDOW_MS) {
    res.status(429).json({
      message:
        "Duplicate request detected. Please wait a moment before retrying.",
    });
    return;
  }

  activeLocks.set(key, now);

  // Automatically remove the lock entry once the window expires so the Map
  // does not grow unbounded over time.
  setTimeout(() => {
    if (activeLocks.get(key) === now) {
      activeLocks.delete(key);
    }
  }, LOCK_WINDOW_MS);

  next();
};
