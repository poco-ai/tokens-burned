import type { LeaderboardPeriod, LeaderboardWindow } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

export function addUtcDays(value: Date, days: number) {
  return new Date(value.getTime() + days * DAY_MS);
}

export function getUtcDateKey(value: Date) {
  return startOfUtcDay(value).toISOString().slice(0, 10);
}

export function resolveLeaderboardWindow(
  period: LeaderboardPeriod,
  now = new Date(),
): LeaderboardWindow {
  if (period === "all_time") {
    return {
      start: null,
      end: null,
    };
  }

  const today = startOfUtcDay(now);
  const end = addUtcDays(today, 1);

  if (period === "day") {
    return {
      start: today,
      end,
    };
  }

  return {
    start: addUtcDays(today, period === "week" ? -6 : -29),
    end,
  };
}

export function sameLeaderboardWindow(
  left: LeaderboardWindow,
  right: LeaderboardWindow,
) {
  return (
    left.start?.getTime() === right.start?.getTime() &&
    left.end?.getTime() === right.end?.getTime()
  );
}
