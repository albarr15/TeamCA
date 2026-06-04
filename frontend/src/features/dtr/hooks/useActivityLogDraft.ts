import { useEffect, useRef, useCallback } from "react";

const DRAFT_KEY = "dtr_activity_log_draft";
const DEBOUNCE_MS = 800;

/**
 * Persists the activity-log textarea value to sessionStorage with debouncing.
 *
 * - Restores any unfinished draft on mount (e.g. after refresh / accidental close).
 * - Clears the draft after a successful clock-out submission.
 * - Uses sessionStorage so the draft never leaks across logins or browser sessions.
 */
export function useActivityLogDraft(
  value: string,
  setValue: (v: string) => void,
) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  // ── Restore draft on first mount ──────────────────────────────────────────
  useEffect(() => {
    if (isMounted.current) return;
    isMounted.current = true;

    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        setValue(saved);
      }
    } catch {
      // sessionStorage unavailable (private browsing, storage quota, etc.) — ignore
    }
  }, [setValue]);

  // ── Debounced save on every value change ──────────────────────────────────
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      try {
        if (value.trim()) {
          sessionStorage.setItem(DRAFT_KEY, value);
        } else {
          sessionStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        // ignore write failures
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [value]);

  // ── Call this after a successful submission to wipe the draft ─────────────
  const clearDraft = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { clearDraft };
}