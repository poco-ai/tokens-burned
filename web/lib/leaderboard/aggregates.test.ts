import { describe, expect, it, vi } from "vitest";
import {
  collectAffectedLeaderboardDates,
  findExistingSessionStartDates,
  invalidateLeaderboardSnapshots,
  recomputeLeaderboardUserDays,
} from "./aggregates";

const mocks = vi.hoisted(() => ({
  prisma: {
    usageSession: {
      findMany: vi.fn(),
    },
    usageBucket: {
      findMany: vi.fn(),
    },
    leaderboardUserDay: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    leaderboardSnapshot: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

describe("collectAffectedLeaderboardDates", () => {
  it("deduplicates and sorts bucket, session, and previous session dates by Shanghai day", () => {
    const dates = collectAffectedLeaderboardDates({
      bucketStarts: ["2026-03-28T02:00:00.000Z", "2026-03-28T18:00:00.000Z"],
      sessionStarts: ["2026-03-29T01:00:00.000Z"],
      existingSessionStarts: ["2026-03-27T23:59:59.000Z"],
    });

    expect(dates.map((value) => value.toISOString())).toEqual([
      "2026-03-27T16:00:00.000Z",
      "2026-03-28T16:00:00.000Z",
    ]);
  });
});

describe("findExistingSessionStartDates", () => {
  it("returns an empty array when sessions list is empty", async () => {
    const db = {
      usageSession: { findMany: vi.fn() },
    };

    const result = await findExistingSessionStartDates(db, {
      userId: "user-1",
      deviceId: "device-1",
      sessions: [],
    });

    expect(result).toEqual([]);
    expect(db.usageSession.findMany).not.toHaveBeenCalled();
  });

  it("queries sessions and returns firstMessageAt dates", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([
        { firstMessageAt: new Date("2026-03-28T02:00:00.000Z") },
        { firstMessageAt: new Date("2026-03-29T10:00:00.000Z") },
      ]);
    const db = {
      usageSession: { findMany },
    };

    const result = await findExistingSessionStartDates(db, {
      userId: "user-1",
      deviceId: "device-1",
      sessions: [
        { source: "claude", sessionHash: "abc123" },
        { source: "claude", sessionHash: "def456" },
      ],
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        deviceId: "device-1",
        OR: [
          { source: "claude", sessionHash: "abc123" },
          { source: "claude", sessionHash: "def456" },
        ],
      },
      select: { firstMessageAt: true },
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(new Date("2026-03-28T02:00:00.000Z"));
    expect(result[1]).toEqual(new Date("2026-03-29T10:00:00.000Z"));
  });
});

describe("invalidateLeaderboardSnapshots", () => {
  it("calls deleteMany on leaderboardSnapshot with empty filter", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const db = {
      leaderboardSnapshot: { deleteMany },
    };

    await invalidateLeaderboardSnapshots(db);

    expect(deleteMany).toHaveBeenCalledWith({});
  });
});

describe("recomputeLeaderboardUserDays", () => {
  function createMockDb(overrides: Record<string, unknown> = {}) {
    return {
      usageBucket: {
        findMany: vi.fn().mockResolvedValue([]),
        ...((overrides.usageBucket as Record<string, unknown>) ?? {}),
      },
      usageSession: {
        findMany: vi.fn().mockResolvedValue([]),
        ...((overrides.usageSession as Record<string, unknown>) ?? {}),
      },
      leaderboardUserDay: {
        upsert: vi.fn().mockResolvedValue(undefined),
        deleteMany: vi.fn().mockResolvedValue(undefined),
        ...((overrides.leaderboardUserDay as Record<string, unknown>) ?? {}),
      },
      leaderboardSnapshot: {
        deleteMany: vi.fn().mockResolvedValue(undefined),
      },
    };
  }

  it("returns early when dates array is empty", async () => {
    const db = createMockDb();

    await recomputeLeaderboardUserDays(db, {
      userId: "user-1",
      dates: [],
    });

    expect(db.usageBucket.findMany).not.toHaveBeenCalled();
    expect(db.usageSession.findMany).not.toHaveBeenCalled();
  });

  it("accumulates buckets and sessions into leaderboard user days", async () => {
    const bucketStart = new Date("2026-03-28T00:00:00.000Z");
    const firstMessageAt = new Date("2026-03-28T05:00:00.000Z");

    const db = createMockDb({
      usageBucket: {
        findMany: vi.fn().mockResolvedValue([
          {
            bucketStart,
            inputTokens: 1000n,
            outputTokens: 500n,
            reasoningTokens: 200n,
            cachedTokens: 100n,
            totalTokens: 1800n,
          },
        ]),
      },
      usageSession: {
        findMany: vi.fn().mockResolvedValue([
          {
            firstMessageAt,
            activeSeconds: 120,
            messageCount: 10,
            userMessageCount: 5,
          },
        ]),
      },
    });

    await recomputeLeaderboardUserDays(db, {
      userId: "user-1",
      dates: [bucketStart],
    });

    expect(db.leaderboardUserDay.upsert).toHaveBeenCalledTimes(1);
    const upsertArg = db.leaderboardUserDay.upsert.mock.calls[0][0];
    expect(upsertArg.update.inputTokens).toBe(1000n);
    expect(upsertArg.update.outputTokens).toBe(500n);
    expect(upsertArg.update.activeSeconds).toBe(120);
    expect(upsertArg.update.sessions).toBe(1);
    expect(upsertArg.update.messages).toBe(10);
    expect(upsertArg.update.userMessages).toBe(5);
  });

  it("deletes leaderboard user days when no data exists for a date", async () => {
    const dateWithData = new Date("2026-03-28T00:00:00.000Z");
    const dateWithoutData = new Date("2026-03-29T00:00:00.000Z");

    const db = createMockDb({
      usageBucket: {
        findMany: vi.fn().mockResolvedValue([
          {
            bucketStart: dateWithData,
            inputTokens: 500n,
            outputTokens: 200n,
            reasoningTokens: 0n,
            cachedTokens: 0n,
            totalTokens: 700n,
          },
        ]),
      },
      usageSession: {
        findMany: vi.fn().mockResolvedValue([
          {
            firstMessageAt: dateWithData,
            activeSeconds: 60,
            messageCount: 5,
            userMessageCount: 3,
          },
        ]),
      },
    });

    await recomputeLeaderboardUserDays(db, {
      userId: "user-1",
      dates: [dateWithData, dateWithoutData],
    });

    // dateWithData has data -> upsert
    expect(db.leaderboardUserDay.upsert).toHaveBeenCalledTimes(1);
    // dateWithoutData has no data -> deleteMany
    expect(db.leaderboardUserDay.deleteMany).toHaveBeenCalledTimes(1);
    const deleteArg = db.leaderboardUserDay.deleteMany.mock.calls[0][0];
    expect(deleteArg.where.userId).toBe("user-1");
  });

  it("handles multi-date scenario with data across several days", async () => {
    const day1 = new Date("2026-03-27T16:00:00.000Z");
    const day2 = new Date("2026-03-28T16:00:00.000Z");
    const day3 = new Date("2026-03-29T16:00:00.000Z");

    const db = createMockDb({
      usageBucket: {
        findMany: vi.fn().mockResolvedValue([
          {
            bucketStart: day1,
            inputTokens: 100n,
            outputTokens: 50n,
            reasoningTokens: 0n,
            cachedTokens: 0n,
            totalTokens: 150n,
          },
          {
            bucketStart: day2,
            inputTokens: 200n,
            outputTokens: 100n,
            reasoningTokens: 10n,
            cachedTokens: 5n,
            totalTokens: 315n,
          },
        ]),
      },
      usageSession: {
        findMany: vi.fn().mockResolvedValue([
          {
            firstMessageAt: day1,
            activeSeconds: 30,
            messageCount: 3,
            userMessageCount: 2,
          },
          {
            firstMessageAt: day2,
            activeSeconds: 60,
            messageCount: 8,
            userMessageCount: 4,
          },
        ]),
      },
    });

    await recomputeLeaderboardUserDays(db, {
      userId: "user-1",
      dates: [day1, day2, day3],
    });

    // day1 and day2 have data -> upsert; day3 has no data -> deleteMany
    expect(db.leaderboardUserDay.upsert).toHaveBeenCalledTimes(2);
    expect(db.leaderboardUserDay.deleteMany).toHaveBeenCalledTimes(1);
  });
});
