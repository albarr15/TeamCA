import { describe, expect, it } from "vitest";

import {
  computeStatus,
  greetingFor,
  isWorkingDay,
  minutesToTime12,
  parseTimeToMinutes,
  type StatusContext,
} from "./productivityMessage";
import type { ProductivitySummary } from "../types/productivity";

// ─── helpers ────────────────────────────────────────────────────────────────

const baseSummary = (
  overrides: Partial<ProductivitySummary["week"]> = {},
  streakOverrides: Partial<ProductivitySummary["streak"]> = {},
): ProductivitySummary => ({
  user: { first_name: "Test", last_name: "User" },
  week: {
    start: new Date("2026-06-01T00:00:00+08:00").toISOString(),
    end: new Date("2026-06-07T23:59:59+08:00").toISOString(),
    hours_worked: 0,
    target_hours: 40,
    tasks_completed: 0,
    days_clocked_in: 0,
    ...overrides,
  },
  streak: { current_days: 0, longest_days: 0, ...streakOverrides },
  recent_completions: [],
});

// All "now" times in this file are constructed as local-time Dates because
// computeStatus uses now.getHours()/getMinutes() (local fields), matching the
// production code which builds a PH-localized Date before passing it in.
const at = (hour: number, minute = 0): Date => {
  const d = new Date(2026, 5, 4, hour, minute); // June 4 2026 (a Thursday in local time)
  return d;
};

const ctxBase = (
  overrides: Partial<StatusContext> = {},
): StatusContext => ({
  now: at(10, 0),
  summary: baseSummary(),
  clockedIn: false,
  isOnBreak: false,
  clockInTime: null,
  workingDay: true,
  ...overrides,
});

// ─── parseTimeToMinutes ─────────────────────────────────────────────────────

describe("parseTimeToMinutes", () => {
  it("parses HH:MM correctly", () => {
    expect(parseTimeToMinutes("08:00")).toBe(480);
    expect(parseTimeToMinutes("17:30")).toBe(1050);
    expect(parseTimeToMinutes("00:00")).toBe(0);
  });

  it("returns undefined for invalid input", () => {
    expect(parseTimeToMinutes(undefined)).toBeUndefined();
    expect(parseTimeToMinutes("")).toBeUndefined();
    expect(parseTimeToMinutes("not-a-time")).toBeUndefined();
  });
});

// ─── minutesToTime12 ────────────────────────────────────────────────────────

describe("minutesToTime12", () => {
  it("formats midnight as 12:00 AM", () => {
    expect(minutesToTime12(0)).toBe("12:00 AM");
  });

  it("formats noon as 12:00 PM", () => {
    expect(minutesToTime12(720)).toBe("12:00 PM");
  });

  it("formats morning hours", () => {
    expect(minutesToTime12(8 * 60 + 30)).toBe("8:30 AM");
    expect(minutesToTime12(9 * 60)).toBe("9:00 AM");
  });

  it("formats afternoon hours", () => {
    expect(minutesToTime12(13 * 60)).toBe("1:00 PM");
    expect(minutesToTime12(17 * 60 + 5)).toBe("5:05 PM");
  });

  it("wraps minutes outside [0, 24*60)", () => {
    expect(minutesToTime12(24 * 60)).toBe("12:00 AM");
    expect(minutesToTime12(-30)).toBe("11:30 PM");
  });
});

// ─── isWorkingDay ───────────────────────────────────────────────────────────

describe("isWorkingDay", () => {
  it("returns true when no working_days configured", () => {
    expect(isWorkingDay(new Date(2026, 5, 6))).toBe(true); // Saturday
    expect(isWorkingDay(new Date(2026, 5, 6), [])).toBe(true);
  });

  it("matches against short keys (M, T, etc.)", () => {
    const monday = new Date(2026, 5, 1); // June 1 2026 = Monday
    const saturday = new Date(2026, 5, 6);
    expect(isWorkingDay(monday, ["M", "T", "W", "Th", "F"])).toBe(true);
    expect(isWorkingDay(saturday, ["M", "T", "W", "Th", "F"])).toBe(false);
  });

  it("matches against long keys (Monday, Tuesday, etc.) as a fallback", () => {
    const monday = new Date(2026, 5, 1);
    expect(
      isWorkingDay(monday, [
        "Monday" as never,
        "Tuesday" as never,
        "Wednesday" as never,
      ]),
    ).toBe(true);
  });

  it("handles Saturday-inclusive schedules", () => {
    const saturday = new Date(2026, 5, 6);
    expect(isWorkingDay(saturday, ["M", "T", "W", "Th", "F", "Sat"])).toBe(true);
  });
});

// ─── greetingFor ────────────────────────────────────────────────────────────

describe("greetingFor", () => {
  it("3am → Late night, moon icon", () => {
    const g = greetingFor(3);
    expect(g.label).toBe("Late night");
    expect(g.iconKey).toBe("moon");
  });

  it("6am → Early start, sunrise icon", () => {
    expect(greetingFor(6).label).toBe("Early start");
    expect(greetingFor(6).iconKey).toBe("sunrise");
  });

  it("10am → Good morning", () => {
    expect(greetingFor(10).label).toBe("Good morning");
  });

  it("14h → Good afternoon, sun icon", () => {
    const g = greetingFor(14);
    expect(g.label).toBe("Good afternoon");
    expect(g.iconKey).toBe("sun");
  });

  it("18h → Good evening, sunset icon", () => {
    const g = greetingFor(18);
    expect(g.label).toBe("Good evening");
    expect(g.iconKey).toBe("sunset");
  });

  it("23h → Burning the midnight oil, moon icon", () => {
    const g = greetingFor(23);
    expect(g.label).toBe("Burning the midnight oil");
    expect(g.iconKey).toBe("moon");
  });
});

// ─── computeStatus: priority chain ──────────────────────────────────────────

describe("computeStatus — non-working day", () => {
  it("returns the day-off message regardless of other state", () => {
    const status = computeStatus(
      ctxBase({ workingDay: false, clockedIn: true, isOnBreak: true }),
    );
    expect(status.text).toMatch(/day off/i);
    expect(status.tone).toBe("good");
    expect(status.iconKey).toBe("coffee");
  });
});

describe("computeStatus — on break", () => {
  it("returns the break message when isOnBreak is true", () => {
    const status = computeStatus(
      ctxBase({ clockedIn: true, isOnBreak: true }),
    );
    expect(status.text).toMatch(/break/i);
    expect(status.tone).toBe("neutral");
    expect(status.iconKey).toBe("sandwich");
  });
});

describe("computeStatus — clocked in", () => {
  it("welcomes a freshly clocked-in user", () => {
    const now = at(9, 10);
    const clockInTime = at(9, 0); // 10 min ago
    const status = computeStatus(
      ctxBase({
        clockedIn: true,
        clockInTime,
        startMin: 9 * 60,
        endMin: 17 * 60,
        now,
      }),
    );
    expect(status.text).toMatch(/Welcome in/);
    expect(status.tone).toBe("good");
    expect(status.iconKey).toBe("briefcase");
  });

  it("nudges to take a break after a long session", () => {
    const now = at(13, 30);
    const clockInTime = at(9, 0); // ~4.5h ago
    const status = computeStatus(
      ctxBase({
        clockedIn: true,
        clockInTime,
        startMin: 9 * 60,
        endMin: 18 * 60, // shift end far enough away so end-time rules don't fire
        now,
      }),
    );
    expect(status.text).toMatch(/clocked in for 4h/);
    expect(status.iconKey).toBe("coffee");
  });

  it("warns about approaching end time (within 30 min)", () => {
    const now = at(16, 45);
    const status = computeStatus(
      ctxBase({
        clockedIn: true,
        clockInTime: at(9, 0),
        startMin: 9 * 60,
        endMin: 17 * 60,
        now,
      }),
    );
    expect(status.text).toMatch(/15 min until your usual 5:00 PM clock-out/);
    expect(status.iconKey).toBe("clock");
  });

  it("warns about overtime when > 15 min past end", () => {
    const now = at(19, 30); // 2h 30m past 17:00
    const status = computeStatus(
      ctxBase({
        clockedIn: true,
        clockInTime: at(9, 0),
        startMin: 9 * 60,
        endMin: 17 * 60,
        now,
      }),
    );
    expect(status.text).toMatch(/2h 30m past your usual 5:00 PM clock-out/);
    expect(status.tone).toBe("warn");
    expect(status.iconKey).toBe("alert");
  });
});

describe("computeStatus — not clocked in, with start time", () => {
  it("late >30 min → late tone, urgent message", () => {
    const now = at(9, 45); // 45 min past 9:00 start
    const status = computeStatus(
      ctxBase({
        clockedIn: false,
        startMin: 9 * 60,
        endMin: 17 * 60,
        now,
      }),
    );
    expect(status.text).toMatch(/you're 45 min late!/);
    expect(status.tone).toBe("late");
    expect(status.iconKey).toBe("alert");
  });

  it("slightly past start (0–30 min) → warn", () => {
    const now = at(9, 15); // 15 min past
    const status = computeStatus(
      ctxBase({
        clockedIn: false,
        startMin: 9 * 60,
        endMin: 17 * 60,
        now,
      }),
    );
    expect(status.text).toMatch(/15 min past your usual 9:00 AM start/);
    expect(status.tone).toBe("warn");
  });

  it("within 15 min of start → almost time", () => {
    const now = at(8, 55); // 5 min before 9:00
    const status = computeStatus(
      ctxBase({
        clockedIn: false,
        startMin: 9 * 60,
        endMin: 17 * 60,
        now,
      }),
    );
    expect(status.text).toMatch(/5 min to 9:00 AM/);
    expect(status.tone).toBe("warn");
    expect(status.iconKey).toBe("clock");
  });

  it("within an hour of start → neutral countdown", () => {
    const now = at(8, 15); // 45 min before 9:00
    const status = computeStatus(
      ctxBase({
        clockedIn: false,
        startMin: 9 * 60,
        endMin: 17 * 60,
        now,
      }),
    );
    expect(status.text).toMatch(/9:00 AM start is 45 min away/);
    expect(status.tone).toBe("neutral");
  });

  it("> 1h before start → up early", () => {
    const now = at(6, 30); // 2h 30m before 9:00
    const status = computeStatus(
      ctxBase({
        clockedIn: false,
        startMin: 9 * 60,
        endMin: 17 * 60,
        now,
      }),
    );
    expect(status.text).toMatch(/up early/);
    expect(status.iconKey).toBe("sunrise");
  });

  it("past end time, never clocked in → wrapping up message", () => {
    const now = at(18, 0); // after end time
    const status = computeStatus(
      ctxBase({
        clockedIn: false,
        startMin: 9 * 60,
        endMin: 17 * 60,
        now,
      }),
    );
    expect(status.text).toMatch(/wrapping up for the day/i);
    expect(status.iconKey).toBe("sunset");
  });
});

describe("computeStatus — fallback praise/progress", () => {
  it(">=7 day streak → praise message with flame icon", () => {
    const status = computeStatus(
      ctxBase({ summary: baseSummary({}, { current_days: 12 }) }),
    );
    expect(status.text).toMatch(/12 days in a row/);
    expect(status.tone).toBe("praise");
    expect(status.iconKey).toBe("flame");
  });

  it("3–6 day streak → keep-momentum praise message", () => {
    const status = computeStatus(
      ctxBase({ summary: baseSummary({}, { current_days: 4 }) }),
    );
    expect(status.text).toMatch(/4-day streak/);
    expect(status.tone).toBe("praise");
  });

  it(">=5 tasks completed this week → solid output", () => {
    const status = computeStatus(
      ctxBase({ summary: baseSummary({ tasks_completed: 6 }) }),
    );
    expect(status.text).toMatch(/6 tasks shipped/);
    expect(status.tone).toBe("good");
  });

  it("1–4 tasks → nice work singular/plural", () => {
    const one = computeStatus(
      ctxBase({ summary: baseSummary({ tasks_completed: 1 }) }),
    );
    expect(one.text).toMatch(/1 task completed/);

    const two = computeStatus(
      ctxBase({ summary: baseSummary({ tasks_completed: 2 }) }),
    );
    expect(two.text).toMatch(/2 tasks completed/);
  });

  it("hours logged but no completions → chip away message", () => {
    const status = computeStatus(
      ctxBase({ summary: baseSummary({ hours_worked: 6.4 }) }),
    );
    expect(status.text).toMatch(/6.4h logged/);
  });

  it("totally fresh week → fresh-week message", () => {
    const status = computeStatus(ctxBase());
    expect(status.text).toMatch(/Fresh week ahead/);
    expect(status.tone).toBe("neutral");
  });
});

describe("computeStatus — priority precedence", () => {
  it("non-working-day beats clocked-in + on-break + late conditions", () => {
    const now = at(15, 0);
    const status = computeStatus(
      ctxBase({
        workingDay: false,
        clockedIn: true,
        isOnBreak: true,
        startMin: 9 * 60,
        endMin: 17 * 60,
        now,
      }),
    );
    expect(status.text).toMatch(/day off/i);
  });

  it("on-break beats overtime warning", () => {
    const now = at(20, 0); // would be overtime
    const status = computeStatus(
      ctxBase({
        workingDay: true,
        clockedIn: true,
        isOnBreak: true,
        startMin: 9 * 60,
        endMin: 17 * 60,
        now,
      }),
    );
    expect(status.text).toMatch(/break/i);
  });

  it("late warning beats fallback streak praise", () => {
    const now = at(10, 0);
    const status = computeStatus(
      ctxBase({
        clockedIn: false,
        startMin: 9 * 60,
        endMin: 17 * 60,
        now,
        summary: baseSummary({}, { current_days: 9 }),
      }),
    );
    expect(status.tone).toBe("late");
    expect(status.text).not.toMatch(/streak/);
  });
});
