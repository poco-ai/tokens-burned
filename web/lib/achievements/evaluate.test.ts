import { describe, expect, it } from "vitest";
import {
  type AchievementInputMetrics,
  buildAchievementStatuses,
  computeCurrentStreak,
} from "./evaluate";

function createMetrics(
  overrides: Partial<AchievementInputMetrics> = {},
): AchievementInputMetrics {
  return {
    timezone: "Asia/Shanghai",
    firstSyncAt: "2026-03-01T00:00:00.000Z",
    publicProfileEnabled: false,
    publicProfileUpdatedAt: null,
    activeDayKeys: ["2026-03-29", "2026-03-30", "2026-03-31"],
    todayKey: "2026-03-31",
    yesterdayKey: "2026-03-30",
    totalTokens: 150_000,
    totalSessions: 12,
    totalActiveSeconds: 12 * 60 * 60,
    tokenTimeline: [
      { at: "2026-03-01T00:00:00.000Z", value: 50_000 },
      { at: "2026-03-02T00:00:00.000Z", value: 100_000 },
    ],
    sessionTimeline: Array.from({ length: 12 }, (_, index) => ({
      at: `2026-03-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      value: 1,
    })),
    activeSecondsTimeline: Array.from({ length: 12 }, (_, index) => ({
      at: `2026-03-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      value: 60 * 60,
    })),
    modelTimeline: [
      { at: "2026-03-01T00:00:00.000Z", key: "gpt-5" },
      { at: "2026-03-02T00:00:00.000Z", key: "claude" },
      { at: "2026-03-03T00:00:00.000Z", key: "gemini" },
    ],
    toolTimeline: [
      { at: "2026-03-01T00:00:00.000Z", key: "cursor" },
      { at: "2026-03-02T00:00:00.000Z", key: "claude-code" },
    ],
    projectTimeline: [
      { at: "2026-03-01T00:00:00.000Z", key: "a" },
      { at: "2026-03-02T00:00:00.000Z", key: "b" },
      { at: "2026-03-03T00:00:00.000Z", key: "c" },
      { at: "2026-03-04T00:00:00.000Z", key: "d" },
      { at: "2026-03-05T00:00:00.000Z", key: "e" },
    ],
    deviceTimeline: [
      { at: "2026-03-01T00:00:00.000Z", key: "mac" },
      { at: "2026-03-02T00:00:00.000Z", key: "linux" },
    ],
    reasoningShare30d: 0.3,
    cacheShare30d: 0.16,
    topProjectShare30d: 0.72,
    recentWindowUnlockedAt: "2026-03-31T00:00:00.000Z",
    followingCount: 1,
    firstFollowingAt: "2026-03-10T00:00:00.000Z",
    followerCount: 1,
    firstFollowerAt: "2026-03-11T00:00:00.000Z",
    mutualCount: 3,
    mutualReachedAt: "2026-03-20T00:00:00.000Z",
    currentPersona: "reasoning_master",
    ...overrides,
  };
}

describe("computeCurrentStreak", () => {
  it("counts consecutive days when activity reaches today", () => {
    expect(
      computeCurrentStreak({
        activeDayKeys: ["2026-03-29", "2026-03-30", "2026-03-31"],
        todayKey: "2026-03-31",
        yesterdayKey: "2026-03-30",
      }),
    ).toBe(3);
  });

  it("resets to zero when the latest activity is stale", () => {
    expect(
      computeCurrentStreak({
        activeDayKeys: ["2026-03-20", "2026-03-21"],
        todayKey: "2026-03-31",
        yesterdayKey: "2026-03-30",
      }),
    ).toBe(0);
  });
});

describe("buildAchievementStatuses", () => {
  it("unlocks milestone achievements once thresholds are met", () => {
    const statuses = buildAchievementStatuses(createMetrics());
    const unlockedCodes = new Set(
      statuses.filter((status) => status.unlocked).map((status) => status.code),
    );

    expect(unlockedCodes.has("first_sync")).toBe(true);
    expect(unlockedCodes.has("streak_3")).toBe(true);
    expect(unlockedCodes.has("tokens_100k")).toBe(true);
    expect(unlockedCodes.has("sessions_10")).toBe(true);
    expect(unlockedCodes.has("reasoning_25")).toBe(true);
    expect(unlockedCodes.has("mutual_3")).toBe(true);
    expect(unlockedCodes.has("streak_7")).toBe(false);
  });

  it("keeps locked achievements capped below full progress", () => {
    const statuses = buildAchievementStatuses(
      createMetrics({
        totalTokens: 400_000,
        tokenTimeline: [
          { at: "2026-03-01T00:00:00.000Z", value: 150_000 },
          { at: "2026-03-02T00:00:00.000Z", value: 250_000 },
        ],
      }),
    );
    const million = statuses.find((status) => status.code === "tokens_1m");

    expect(million?.unlocked).toBe(false);
    expect(million?.progress.ratio).toBeCloseTo(0.4);
  });
});
