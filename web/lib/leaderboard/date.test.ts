import { describe, expect, it } from "vitest";
import { getUtcDateKey, resolveLeaderboardWindow, startOfUtcDay } from "./date";

describe("leaderboard date helpers", () => {
  it("normalizes a timestamp to UTC midnight", () => {
    expect(
      startOfUtcDay(new Date("2026-03-28T19:45:00.000Z")).toISOString(),
    ).toBe("2026-03-28T00:00:00.000Z");
  });

  it("builds day and week windows using UTC day boundaries", () => {
    const now = new Date("2026-03-28T19:45:00.000Z");

    expect(resolveLeaderboardWindow("day", now)).toEqual({
      start: new Date("2026-03-28T00:00:00.000Z"),
      end: new Date("2026-03-29T00:00:00.000Z"),
    });
    expect(resolveLeaderboardWindow("week", now)).toEqual({
      start: new Date("2026-03-22T00:00:00.000Z"),
      end: new Date("2026-03-29T00:00:00.000Z"),
    });
  });

  it("returns an ISO date key in UTC", () => {
    expect(getUtcDateKey(new Date("2026-03-28T23:59:59.999Z"))).toBe(
      "2026-03-28",
    );
  });
});
