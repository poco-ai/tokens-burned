import { describe, expect, it } from "vitest";
import {
  buildLeaderboardBadgeAwards,
  type RankedLeaderboardEntry,
} from "./finalize";

function createEntry(
  overrides: Partial<RankedLeaderboardEntry> &
    Pick<RankedLeaderboardEntry, "userId" | "rank">,
): RankedLeaderboardEntry {
  const { userId, rank, ...rest } = overrides;
  return {
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    cachedTokens: 0,
    totalTokens: 100,
    activeSeconds: 60,
    sessions: 1,
    userId,
    rank,
    ...rest,
  };
}

describe("buildLeaderboardBadgeAwards", () => {
  it("emits repeatable badge awards for the top 50 users in a finalized weekly window", () => {
    const awards = buildLeaderboardBadgeAwards({
      period: "week",
      windowStart: new Date("2026-03-29T16:00:00.000Z"),
      windowEnd: new Date("2026-04-05T16:00:00.000Z"),
      finalizedAt: new Date("2026-04-05T20:00:00.000Z"),
      entries: [
        createEntry({ userId: "user_1", rank: 1 }),
        createEntry({ userId: "user_2", rank: 50 }),
        createEntry({ userId: "user_3", rank: 51 }),
      ],
    });

    expect(awards).toHaveLength(2);
    expect(awards.map((award) => award.code)).toEqual([
      "leaderboard_week_top50",
      "leaderboard_week_top50",
    ]);
    expect(awards.map((award) => award.userId)).toEqual(["user_1", "user_2"]);
    expect(awards[0]?.dedupeKey).toBe(
      "leaderboard:week:2026-03-29T16:00:00.000Z:user_1:leaderboard_week_top50",
    );
  });

  it("skips all-time snapshots because only day/week/month are settled periodically", () => {
    const awards = buildLeaderboardBadgeAwards({
      period: "all_time",
      windowStart: null,
      windowEnd: null,
      finalizedAt: new Date("2026-04-05T20:00:00.000Z"),
      entries: [createEntry({ userId: "user_1", rank: 1 })],
    });

    expect(awards).toEqual([]);
  });
});
