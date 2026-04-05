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
    totalTokens: 15_000_000,
    totalSessions: 12,
    totalActiveSeconds: 12 * 60 * 60,
    tokenTimeline: [
      { at: "2026-03-01T00:00:00.000Z", value: 5_000_000 },
      { at: "2026-03-02T00:00:00.000Z", value: 10_000_000 },
    ],
    costTimeline: [],
    totalEstimatedCostUsd: 0,
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
    followingTimeline: ["2026-03-10T00:00:00.000Z"],
    followerCount: 1,
    firstFollowerAt: "2026-03-11T00:00:00.000Z",
    followerTimeline: ["2026-03-11T00:00:00.000Z"],
    mutualCount: 3,
    mutualReachedAt: "2026-03-20T00:00:00.000Z",
    mutualTimeline: [
      "2026-03-12T00:00:00.000Z",
      "2026-03-16T00:00:00.000Z",
      "2026-03-20T00:00:00.000Z",
    ],
    currentPersona: "reasoning_master",
    leaderboardDayRank: null,
    leaderboardWeekRank: null,
    leaderboardMonthRank: null,
    leaderboardAllTimeRank: null,
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
    expect(unlockedCodes.has("sessions_1")).toBe(true);
    expect(unlockedCodes.has("streak_3")).toBe(true);
    expect(unlockedCodes.has("tokens_100k")).toBe(true);
    expect(unlockedCodes.has("active_hours_10")).toBe(true);
    expect(unlockedCodes.has("reasoning_25")).toBe(true);
    expect(unlockedCodes.has("mutual_3")).toBe(true);
    expect(unlockedCodes.has("streak_7")).toBe(false);
    expect(unlockedCodes.has("models_3")).toBe(false);
    expect(unlockedCodes.has("models_5")).toBe(false);
    expect(unlockedCodes.has("models_20")).toBe(false);
    expect(unlockedCodes.has("tools_2")).toBe(false);
    expect(unlockedCodes.has("projects_5")).toBe(false);
    expect(unlockedCodes.has("devices_2")).toBe(false);
  });

  it("keeps locked achievements capped below full progress", () => {
    const statuses = buildAchievementStatuses(
      createMetrics({
        totalTokens: 40_000_000,
        tokenTimeline: [
          { at: "2026-03-01T00:00:00.000Z", value: 15_000_000 },
          { at: "2026-03-02T00:00:00.000Z", value: 25_000_000 },
        ],
      }),
    );
    const million = statuses.find((status) => status.code === "tokens_1m");

    expect(million?.unlocked).toBe(false);
    expect(million?.progress.ratio).toBeCloseTo(0.4);
  });

  it("unlocks expanded ladder achievements when higher thresholds are met", () => {
    const statuses = buildAchievementStatuses(
      createMetrics({
        activeDayKeys: Array.from({ length: 365 }, (_, index) => {
          const date = new Date("2025-04-01T00:00:00.000Z");
          date.setUTCDate(date.getUTCDate() + index);
          return date.toISOString().slice(0, 10);
        }),
        totalTokens: 1_200_000_000_000,
        totalSessions: 100_000,
        totalActiveSeconds: 2000 * 60 * 60,
        tokenTimeline: [
          { at: "2025-04-01T00:00:00.000Z", value: 1_200_000_000_000 },
        ],
        costTimeline: [{ at: "2025-04-01T00:00:00.000Z", value: 100_000 }],
        totalEstimatedCostUsd: 100_000,
        sessionTimeline: [{ at: "2025-04-01T00:00:00.000Z", value: 100_000 }],
        activeSecondsTimeline: Array.from({ length: 2000 }, (_, index) => ({
          at: new Date(Date.UTC(2025, 0, 1 + index)).toISOString(),
          value: 60 * 60,
        })),
        modelTimeline: Array.from({ length: 20 }, (_, index) => ({
          at: new Date(Date.UTC(2026, 2, index + 1)).toISOString(),
          key: `model-${index + 1}`,
        })),
        toolTimeline: Array.from({ length: 8 }, (_, index) => ({
          at: new Date(Date.UTC(2026, 1, index + 1)).toISOString(),
          key: `tool-${index + 1}`,
        })),
        projectTimeline: Array.from({ length: 50 }, (_, index) => ({
          at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
          key: `project-${index + 1}`,
        })),
        deviceTimeline: Array.from({ length: 5 }, (_, index) => ({
          at: new Date(Date.UTC(2026, 3, index + 1)).toISOString(),
          key: `device-${index + 1}`,
        })),
        reasoningShare30d: 0.42,
        cacheShare30d: 0.96,
        topProjectShare30d: 0.91,
        followingCount: 10,
        followingTimeline: Array.from({ length: 10 }, (_, index) =>
          new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
        ),
        followerCount: 10,
        followerTimeline: Array.from({ length: 10 }, (_, index) =>
          new Date(Date.UTC(2026, 1, index + 1)).toISOString(),
        ),
        mutualCount: 10,
        mutualTimeline: Array.from({ length: 10 }, (_, index) =>
          new Date(Date.UTC(2026, 2, index + 1)).toISOString(),
        ),
        mutualReachedAt: "2026-03-03T00:00:00.000Z",
      }),
    );
    const unlockedCodes = new Set(
      statuses.filter((status) => status.unlocked).map((status) => status.code),
    );

    expect(unlockedCodes.has("active_days_365")).toBe(true);
    expect(unlockedCodes.has("tokens_100b")).toBe(true);
    expect(unlockedCodes.has("sessions_100k")).toBe(true);
    expect(unlockedCodes.has("spend_usd_100k")).toBe(true);
    expect(unlockedCodes.has("active_hours_2000")).toBe(true);
    expect(unlockedCodes.has("reasoning_40")).toBe(true);
    expect(unlockedCodes.has("cache_30")).toBe(true);
    expect(unlockedCodes.has("project_focus_90")).toBe(true);
    expect(unlockedCodes.has("models_5")).toBe(true);
    expect(unlockedCodes.has("models_20")).toBe(true);
    expect(unlockedCodes.has("tools_4")).toBe(true);
    expect(unlockedCodes.has("projects_15")).toBe(true);
    expect(unlockedCodes.has("devices_3")).toBe(true);
    expect(unlockedCodes.has("following_10")).toBe(true);
    expect(unlockedCodes.has("followers_10")).toBe(true);
    expect(unlockedCodes.has("mutual_10")).toBe(true);
  });

  it("unlocks leaderboard tier achievements when ranks qualify", () => {
    const statuses = buildAchievementStatuses(
      createMetrics({
        leaderboardDayRank: 40,
        leaderboardWeekRank: 12,
        leaderboardMonthRank: 5,
        leaderboardAllTimeRank: 1,
      }),
    );
    const unlockedCodes = new Set(
      statuses.filter((status) => status.unlocked).map((status) => status.code),
    );

    expect(unlockedCodes.has("leaderboard_day_top50")).toBe(true);
    expect(unlockedCodes.has("leaderboard_week_top50")).toBe(true);
    expect(unlockedCodes.has("leaderboard_month_top50")).toBe(true);
    expect(unlockedCodes.has("leaderboard_all_time_top100")).toBe(true);
    expect(unlockedCodes.has("leaderboard_all_time_top10")).toBe(true);
    expect(unlockedCodes.has("leaderboard_all_time_first")).toBe(true);
  });

  it("keeps leaderboard achievements locked when ranks are outside thresholds", () => {
    const statuses = buildAchievementStatuses(
      createMetrics({
        leaderboardDayRank: 80,
        leaderboardAllTimeRank: 200,
      }),
    );
    const unlockedCodes = new Set(
      statuses.filter((status) => status.unlocked).map((status) => status.code),
    );

    expect(unlockedCodes.has("leaderboard_day_top50")).toBe(false);
    expect(unlockedCodes.has("leaderboard_all_time_top100")).toBe(false);
  });
});
