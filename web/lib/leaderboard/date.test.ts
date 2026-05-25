import { describe, expect, it } from "vitest";
import {
  formatLeaderboardWindowLabel,
  getShanghaiDateKey,
  resolveLatestFinalizableLeaderboardWindow,
  resolveLeaderboardWindow,
  SHANGHAI_TIMEZONE,
  sameLeaderboardWindow,
  startOfShanghaiDay,
} from "./date";

describe("leaderboard date helpers", () => {
  it("normalizes a timestamp to Shanghai midnight", () => {
    expect(
      startOfShanghaiDay(new Date("2026-03-28T19:45:00.000Z")).toISOString(),
    ).toBe("2026-03-28T16:00:00.000Z");
  });

  it("builds day, week, and month windows using Shanghai calendar boundaries", () => {
    const now = new Date("2026-04-01T01:45:00.000Z");

    expect(resolveLeaderboardWindow("day", now)).toEqual({
      start: new Date("2026-03-31T16:00:00.000Z"),
      end: new Date("2026-04-01T16:00:00.000Z"),
    });
    expect(resolveLeaderboardWindow("week", now)).toEqual({
      start: new Date("2026-03-29T16:00:00.000Z"),
      end: new Date("2026-04-05T16:00:00.000Z"),
    });
    expect(resolveLeaderboardWindow("month", now)).toEqual({
      start: new Date("2026-03-31T16:00:00.000Z"),
      end: new Date("2026-04-30T16:00:00.000Z"),
    });
  });

  it("returns an ISO date key in Shanghai time", () => {
    expect(getShanghaiDateKey(new Date("2026-03-28T23:59:59.999Z"))).toBe(
      "2026-03-29",
    );
  });

  it("resolves the latest finalizable weekly and monthly windows at 4am Shanghai time", () => {
    expect(
      resolveLatestFinalizableLeaderboardWindow(
        "week",
        new Date("2026-04-05T19:59:59.999Z"),
      ),
    ).toBeNull();
    expect(
      resolveLatestFinalizableLeaderboardWindow(
        "week",
        new Date("2026-04-05T20:00:00.000Z"),
      ),
    ).toEqual({
      start: new Date("2026-03-29T16:00:00.000Z"),
      end: new Date("2026-04-05T16:00:00.000Z"),
      finalizeAt: new Date("2026-04-05T20:00:00.000Z"),
    });

    expect(
      resolveLatestFinalizableLeaderboardWindow(
        "month",
        new Date("2026-04-30T19:59:59.999Z"),
      ),
    ).toBeNull();
    expect(
      resolveLatestFinalizableLeaderboardWindow(
        "month",
        new Date("2026-04-30T20:00:00.000Z"),
      ),
    ).toEqual({
      start: new Date("2026-03-31T16:00:00.000Z"),
      end: new Date("2026-04-30T16:00:00.000Z"),
      finalizeAt: new Date("2026-04-30T20:00:00.000Z"),
    });
  });

  it("formats window labels for display beside the metric filter", () => {
    expect(
      formatLeaderboardWindowLabel({
        period: "day",
        windowStart: "2026-03-31T16:00:00.000Z",
        windowEnd: "2026-04-01T16:00:00.000Z",
        locale: "zh-CN",
        timezone: SHANGHAI_TIMEZONE,
      }),
    ).toBe("2026.04.01");

    expect(
      formatLeaderboardWindowLabel({
        period: "week",
        windowStart: "2026-03-29T16:00:00.000Z",
        windowEnd: "2026-04-05T16:00:00.000Z",
        locale: "zh-CN",
        timezone: SHANGHAI_TIMEZONE,
      }),
    ).toBe("2026.03.30 - 2026.04.05");
  });

  it("returns null start and end for all_time period", () => {
    const now = new Date("2026-04-01T01:45:00.000Z");
    const window = resolveLeaderboardWindow("all_time", now);

    expect(window.start).toBeNull();
    expect(window.end).toBeNull();
  });

  it("sameLeaderboardWindow returns true for identical windows", () => {
    const now = new Date("2026-04-01T01:45:00.000Z");
    const dayWindow = resolveLeaderboardWindow("day", now);

    expect(sameLeaderboardWindow(dayWindow, dayWindow)).toBe(true);
  });

  it("sameLeaderboardWindow returns false for different windows", () => {
    const now = new Date("2026-04-01T01:45:00.000Z");
    const dayWindow = resolveLeaderboardWindow("day", now);
    const weekWindow = resolveLeaderboardWindow("week", now);

    expect(sameLeaderboardWindow(dayWindow, weekWindow)).toBe(false);
  });

  it("formatLeaderboardWindowLabel returns null for all_time period", () => {
    expect(
      formatLeaderboardWindowLabel({
        period: "all_time",
        windowStart: null,
        windowEnd: null,
        locale: "en",
        timezone: SHANGHAI_TIMEZONE,
      }),
    ).toBeNull();
  });

  it("formatLeaderboardWindowLabel returns null when windowStart is null", () => {
    expect(
      formatLeaderboardWindowLabel({
        period: "day",
        windowStart: null,
        windowEnd: "2026-04-01T16:00:00.000Z",
        locale: "en",
        timezone: SHANGHAI_TIMEZONE,
      }),
    ).toBeNull();
  });

  it("formats month window labels with a date range", () => {
    expect(
      formatLeaderboardWindowLabel({
        period: "month",
        windowStart: "2026-03-31T16:00:00.000Z",
        windowEnd: "2026-04-30T16:00:00.000Z",
        locale: "en",
        timezone: SHANGHAI_TIMEZONE,
      }),
    ).toBe("2026.04.01 - 2026.04.30");
  });

  it("handles day period at month boundary correctly", () => {
    const now = new Date("2026-02-01T01:00:00.000Z");
    const window = resolveLeaderboardWindow("day", now);

    // 2026-02-01 01:00 UTC = 2026-02-01 09:00 Shanghai
    // startOfShanghaiDay = 2026-02-01 00:00 Shanghai = 2026-01-31T16:00:00.000Z
    expect(window.start).toEqual(new Date("2026-01-31T16:00:00.000Z"));
    expect(window.end).toEqual(new Date("2026-02-01T16:00:00.000Z"));
  });
});
