import type { ProductivitySummary } from "../types/productivity";

export type WorkingDay = "M" | "T" | "W" | "Th" | "F" | "Sat" | "Sun";

export type StatusTone = "neutral" | "good" | "praise" | "warn" | "late";

export type StatusIconKey =
  | "alert"
  | "clock"
  | "briefcase"
  | "coffee"
  | "sandwich"
  | "sunrise"
  | "sunset"
  | "flame";

export type Status = {
  text: string;
  tone: StatusTone;
  iconKey?: StatusIconKey;
};

export type GreetingIconKey = "sunrise" | "sun" | "sunset" | "moon";

export type Greeting = {
  label: string;
  iconKey: GreetingIconKey;
  iconClass: string;
};

export type StatusContext = {
  now: Date;
  summary: ProductivitySummary;
  clockedIn: boolean;
  isOnBreak: boolean;
  clockInTime?: Date | null;
  startMin?: number;
  endMin?: number;
  workingDay: boolean;
};

// ─── pure helpers ────────────────────────────────────────────────────────────

export const parseTimeToMinutes = (value?: string): number | undefined => {
  if (!value) return undefined;
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return undefined;
  return h * 60 + m;
};

export const minutesToTime12 = (minutes: number): string => {
  const total = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const DAY_KEY_SHORT: WorkingDay[] = [
  "Sun",
  "M",
  "T",
  "W",
  "Th",
  "F",
  "Sat",
];
const DAY_KEY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const isWorkingDay = (
  date: Date,
  workingDays?: WorkingDay[],
): boolean => {
  if (!workingDays || workingDays.length === 0) return true;
  const idx = date.getDay();
  return (
    workingDays.includes(DAY_KEY_SHORT[idx]) ||
    workingDays.includes(DAY_KEY_LONG[idx] as unknown as WorkingDay)
  );
};

export const greetingFor = (hour: number): Greeting => {
  if (hour < 5) {
    return { label: "Late night", iconKey: "moon", iconClass: "text-indigo-400" };
  }
  if (hour < 7) {
    return { label: "Early start", iconKey: "sunrise", iconClass: "text-amber-500" };
  }
  if (hour < 12) {
    return { label: "Good morning", iconKey: "sunrise", iconClass: "text-amber-500" };
  }
  if (hour < 17) {
    return { label: "Good afternoon", iconKey: "sun", iconClass: "text-amber-500" };
  }
  if (hour < 21) {
    return { label: "Good evening", iconKey: "sunset", iconClass: "text-orange-500" };
  }
  return { label: "Burning the midnight oil", iconKey: "moon", iconClass: "text-indigo-400" };
};

// ─── status message engine ────────────────────────────────────────────────────

export const computeStatus = (ctx: StatusContext): Status => {
  const {
    now,
    summary,
    clockedIn,
    isOnBreak,
    clockInTime,
    startMin,
    endMin,
    workingDay,
  } = ctx;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const { week, streak } = summary;

  // 1. Day off / weekend
  if (!workingDay) {
    return {
      text: "No work scheduled today — enjoy the day off.",
      tone: "good",
      iconKey: "coffee",
    };
  }

  // 2. On break
  if (isOnBreak) {
    return {
      text: "You're on break. Step away from the screen and come back fresh.",
      tone: "neutral",
      iconKey: "sandwich",
    };
  }

  // 3. Clocked in
  if (clockedIn) {
    // 3a. Past end time
    if (endMin != null && nowMin > endMin + 15) {
      const overtimeMin = nowMin - endMin;
      const overH = Math.floor(overtimeMin / 60);
      const overM = overtimeMin % 60;
      const overStr = overH > 0 ? `${overH}h ${overM}m` : `${overM}m`;
      return {
        text: `It's ${minutesToTime12(nowMin)} — you've gone ${overStr} past your usual ${minutesToTime12(endMin)} clock-out. Don't burn out.`,
        tone: "warn",
        iconKey: "alert",
      };
    }
    // 3b. Approaching end time
    if (endMin != null && nowMin >= endMin - 30 && nowMin <= endMin + 15) {
      const remaining = endMin - nowMin;
      if (remaining > 0) {
        return {
          text: `${remaining} min until your usual ${minutesToTime12(endMin)} clock-out. Wrap things up.`,
          tone: "neutral",
          iconKey: "clock",
        };
      }
      return {
        text: "Time to clock out. Don't forget to log what you accomplished.",
        tone: "neutral",
        iconKey: "clock",
      };
    }
    // 3c. Just clocked in
    if (clockInTime) {
      const sessionMin = (now.getTime() - clockInTime.getTime()) / 60000;
      if (sessionMin < 25) {
        return {
          text: "Welcome in. Pick a task and get rolling.",
          tone: "good",
          iconKey: "briefcase",
        };
      }
      if (sessionMin > 200) {
        const sessionH = Math.floor(sessionMin / 60);
        return {
          text: `You've been clocked in for ${sessionH}h — consider a short break.`,
          tone: "neutral",
          iconKey: "coffee",
        };
      }
    }
  } else {
    // 4. Not clocked in
    if (startMin != null) {
      const diff = nowMin - startMin;

      if (diff > 30) {
        const lateH = Math.floor(diff / 60);
        const lateM = diff % 60;
        const lateStr = lateH > 0 ? `${lateH}h ${lateM}m` : `${lateM} min`;
        if (endMin != null && nowMin > endMin) {
          return {
            text: "Past your usual hours — wrapping up for the day?",
            tone: "neutral",
            iconKey: "sunset",
          };
        }
        return {
          text: `It's ${minutesToTime12(nowMin)} — you're ${lateStr} late! Clock in now.`,
          tone: "late",
          iconKey: "alert",
        };
      }
      if (diff > 0) {
        return {
          text: `It's ${minutesToTime12(nowMin)} — ${diff} min past your usual ${minutesToTime12(startMin)} start. Clock in!`,
          tone: "warn",
          iconKey: "alert",
        };
      }
      if (diff > -15) {
        return {
          text: `${-diff} min to ${minutesToTime12(startMin)} — almost time to clock in.`,
          tone: "warn",
          iconKey: "clock",
        };
      }
      if (diff > -60) {
        return {
          text: `Your usual ${minutesToTime12(startMin)} start is ${-diff} min away.`,
          tone: "neutral",
          iconKey: "clock",
        };
      }
      if (diff <= -60 && nowMin < startMin) {
        const minsBefore = -diff;
        return {
          text: `You're up early — your shift starts at ${minutesToTime12(startMin)} (in ${Math.round(minsBefore / 60)}h ${minsBefore % 60}m).`,
          tone: "neutral",
          iconKey: "sunrise",
        };
      }
    }
  }

  // 5. Fallback: streak / weekly progress
  if (streak.current_days >= 7) {
    return {
      text: `${streak.current_days} days in a row of completed work — impressive consistency.`,
      tone: "praise",
      iconKey: "flame",
    };
  }
  if (streak.current_days >= 3) {
    return {
      text: `You're on a ${streak.current_days}-day streak. Keep the momentum going.`,
      tone: "praise",
      iconKey: "flame",
    };
  }
  if (week.tasks_completed >= 5) {
    return {
      text: `${week.tasks_completed} tasks shipped this week. Solid output.`,
      tone: "good",
    };
  }
  if (week.tasks_completed > 0) {
    return {
      text: `${week.tasks_completed} task${week.tasks_completed === 1 ? "" : "s"} completed this week — nice work.`,
      tone: "good",
    };
  }
  if (week.hours_worked > 0) {
    return {
      text: `${week.hours_worked.toFixed(1)}h logged this week. Pick a task to chip away at.`,
      tone: "neutral",
    };
  }
  return {
    text: "Fresh week ahead. Clock in and pick your first task.",
    tone: "neutral",
  };
};
