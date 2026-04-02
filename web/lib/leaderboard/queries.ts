import { getPricingCatalog } from "@/lib/pricing/catalog";
import {
  estimateCostUsd,
  resolveOfficialPricingMatch,
} from "@/lib/pricing/resolve";
import { prisma } from "@/lib/prisma";
import type { FollowTagFilter } from "@/lib/social/follow-tags";
import { tokenCountToBigInt, tokenCountToNumber } from "@/lib/token-counts";
import { resolveLeaderboardWindow, sameLeaderboardWindow } from "./date";
import { finalizePendingLeaderboardPeriods } from "./finalize";
import type {
  LeaderboardDataset,
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardPageData,
  LeaderboardPeriod,
  LeaderboardWindow,
} from "./types";

const LEADERBOARD_PAGE_LIMIT = 50;
const LEADERBOARD_SNAPSHOT_LIMIT = 100;
const LEADERBOARD_SNAPSHOT_TTL_MS = 5 * 60 * 1000;

const leaderboardUserSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
  usagePreference: {
    select: {
      bio: true,
      publicProfileEnabled: true,
    },
  },
  _count: {
    select: {
      followers: true,
      following: true,
    },
  },
} as const;

type LeaderboardEntrySummary = {
  rank: number;
  userId: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  activeSeconds: number;
  sessions: number;
};

type LeaderboardUserUsageAggregate = Omit<
  LeaderboardEntrySummary,
  "rank" | "activeSeconds" | "sessions"
>;

type UsageBucketCostGroupRow = {
  userId: string;
  model: string;
  _sum: {
    inputTokens: number | bigint | null;
    outputTokens: number | bigint | null;
    reasoningTokens: number | bigint | null;
    cachedTokens: number | bigint | null;
    totalTokens: number | bigint | null;
  };
};

type RelationFlags = {
  isFollowing: boolean;
  followsYou: boolean;
};

function coerceInt(value: number | null | undefined) {
  return value ?? 0;
}

function buildWindowWhere(window: LeaderboardWindow) {
  if (!window.start || !window.end) {
    return {};
  }

  return {
    statDate: {
      gte: window.start,
      lt: window.end,
    },
  };
}

function buildBucketWindowWhere(window: LeaderboardWindow) {
  if (!window.start || !window.end) {
    return {};
  }

  return {
    bucketStart: {
      gte: window.start,
      lt: window.end,
    },
  };
}

function toDataset(input: {
  scope: LeaderboardDataset["scope"];
  period: LeaderboardPeriod;
  generatedAt: Date | null;
  window: LeaderboardWindow;
  entries: LeaderboardEntry[];
}): LeaderboardDataset {
  return {
    scope: input.scope,
    period: input.period,
    generatedAt: input.generatedAt?.toISOString() ?? null,
    windowStart: input.window.start?.toISOString() ?? null,
    windowEnd: input.window.end?.toISOString() ?? null,
    entries: input.entries,
  };
}

function mapRelationFlags(
  ids: string[],
  direct: Array<{ followingId: string }>,
  reverse: Array<{ followerId: string }>,
) {
  const followingIds = new Set(direct.map((record) => record.followingId));
  const followerIds = new Set(reverse.map((record) => record.followerId));

  return new Map<string, RelationFlags>(
    ids.map((id) => [
      id,
      {
        isFollowing: followingIds.has(id),
        followsYou: followerIds.has(id),
      },
    ]),
  );
}

async function getRelationMap(
  viewerUserId: string | null | undefined,
  ids: string[],
) {
  if (!viewerUserId || ids.length === 0) {
    return new Map<string, RelationFlags>();
  }

  const [following, followers] = await Promise.all([
    prisma.follow.findMany({
      where: {
        followerId: viewerUserId,
        followingId: {
          in: ids,
        },
      },
      select: {
        followingId: true,
      },
    }),
    prisma.follow.findMany({
      where: {
        followerId: {
          in: ids,
        },
        followingId: viewerUserId,
      },
      select: {
        followerId: true,
      },
    }),
  ]);

  return mapRelationFlags(ids, following, followers);
}

async function getFollowingNetworkIds(
  viewerUserId: string,
  followTag: FollowTagFilter,
) {
  const following = await prisma.follow.findMany({
    where: {
      followerId: viewerUserId,
      ...(followTag === "all"
        ? {}
        : {
            tag: followTag,
          }),
    },
    select: {
      followingId: true,
    },
  });

  return Array.from(
    new Set([viewerUserId, ...following.map((row) => row.followingId)]),
  );
}

function estimateGroupedRowCostUsd(
  row: UsageBucketCostGroupRow,
  catalog: Awaited<ReturnType<typeof getPricingCatalog>>,
) {
  const match = resolveOfficialPricingMatch(catalog, row.model);
  const estimate = estimateCostUsd(
    {
      inputTokens: tokenCountToNumber(row._sum.inputTokens),
      outputTokens: tokenCountToNumber(row._sum.outputTokens),
      reasoningTokens: tokenCountToNumber(row._sum.reasoningTokens),
      cachedTokens: tokenCountToNumber(row._sum.cachedTokens),
    },
    match?.cost,
  );

  return estimate?.totalUsd ?? 0;
}

function buildUserUsageAggregates(
  rows: UsageBucketCostGroupRow[],
  catalog: Awaited<ReturnType<typeof getPricingCatalog>>,
) {
  const aggregates = new Map<string, LeaderboardUserUsageAggregate>();

  for (const row of rows) {
    const current = aggregates.get(row.userId) ?? {
      userId: row.userId,
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    };

    current.inputTokens += tokenCountToNumber(row._sum.inputTokens);
    current.outputTokens += tokenCountToNumber(row._sum.outputTokens);
    current.reasoningTokens += tokenCountToNumber(row._sum.reasoningTokens);
    current.cachedTokens += tokenCountToNumber(row._sum.cachedTokens);
    current.totalTokens += tokenCountToNumber(row._sum.totalTokens);
    current.estimatedCostUsd += estimateGroupedRowCostUsd(row, catalog);

    aggregates.set(row.userId, current);
  }

  return aggregates;
}

function hasMetricValue(
  summary: Pick<LeaderboardEntrySummary, "estimatedCostUsd" | "totalTokens">,
  metric: LeaderboardMetric,
) {
  return metric === "estimated_cost"
    ? summary.estimatedCostUsd > 0
    : summary.totalTokens > 0;
}

function compareLeaderboardSummaries(
  left: Pick<
    LeaderboardEntrySummary,
    "estimatedCostUsd" | "totalTokens" | "userId"
  >,
  right: Pick<
    LeaderboardEntrySummary,
    "estimatedCostUsd" | "totalTokens" | "userId"
  >,
  metric: LeaderboardMetric,
) {
  const metricDiff =
    metric === "estimated_cost"
      ? right.estimatedCostUsd - left.estimatedCostUsd
      : right.totalTokens - left.totalTokens;

  if (metricDiff !== 0) {
    return metricDiff;
  }

  if (right.totalTokens !== left.totalTokens) {
    return right.totalTokens - left.totalTokens;
  }

  return left.userId.localeCompare(right.userId);
}

function rankLeaderboardSummaries(
  summaries: LeaderboardEntrySummary[],
  metric: LeaderboardMetric,
  limit: number,
) {
  return summaries
    .filter((summary) => hasMetricValue(summary, metric))
    .sort((left, right) => compareLeaderboardSummaries(left, right, metric))
    .slice(0, limit)
    .map((summary, index) => ({
      ...summary,
      rank: index + 1,
    }));
}

async function getEstimatedCostMapForUsers(
  userIds: string[],
  window: LeaderboardWindow,
) {
  if (userIds.length === 0) {
    return new Map<string, number>();
  }

  const [catalog, rows] = await Promise.all([
    getPricingCatalog(),
    prisma.usageBucket.groupBy({
      by: ["userId", "model"],
      where: {
        userId: {
          in: userIds,
        },
        ...buildBucketWindowWhere(window),
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        reasoningTokens: true,
        cachedTokens: true,
        totalTokens: true,
      },
    }),
  ]);

  return new Map(
    Array.from(buildUserUsageAggregates(rows, catalog).values()).map((row) => [
      row.userId,
      row.estimatedCostUsd,
    ]),
  );
}

async function getLeaderboardDayStatsMap(
  userIds: string[],
  window: LeaderboardWindow,
) {
  if (userIds.length === 0) {
    return new Map<
      string,
      Pick<LeaderboardEntrySummary, "activeSeconds" | "sessions">
    >();
  }

  const rows = await prisma.leaderboardUserDay.groupBy({
    by: ["userId"],
    where: {
      userId: {
        in: userIds,
      },
      ...buildWindowWhere(window),
    },
    _sum: {
      activeSeconds: true,
      sessions: true,
    },
  });

  return new Map(
    rows.map((row) => [
      row.userId,
      {
        activeSeconds: coerceInt(row._sum.activeSeconds),
        sessions: coerceInt(row._sum.sessions),
      },
    ]),
  );
}

function rankSummaries(
  aggregates: Iterable<LeaderboardUserUsageAggregate>,
  statsMap: Map<
    string,
    Pick<LeaderboardEntrySummary, "activeSeconds" | "sessions">
  >,
  metric: LeaderboardMetric,
  limit: number,
) {
  const summaries = Array.from(aggregates).map((aggregate) => ({
    rank: 0,
    userId: aggregate.userId,
    inputTokens: aggregate.inputTokens,
    outputTokens: aggregate.outputTokens,
    reasoningTokens: aggregate.reasoningTokens,
    cachedTokens: aggregate.cachedTokens,
    totalTokens: aggregate.totalTokens,
    estimatedCostUsd: aggregate.estimatedCostUsd,
    activeSeconds: statsMap.get(aggregate.userId)?.activeSeconds ?? 0,
    sessions: statsMap.get(aggregate.userId)?.sessions ?? 0,
  }));

  return rankLeaderboardSummaries(summaries, metric, limit);
}

async function hydrateEntries(
  summaries: LeaderboardEntrySummary[],
  window: LeaderboardWindow,
  viewerUserId?: string | null,
) {
  if (summaries.length === 0) {
    return [];
  }

  const ids = summaries.map((entry) => entry.userId);
  const needsEstimatedCost = summaries.every(
    (summary) => summary.estimatedCostUsd === 0,
  );
  const [users, relationMap, estimatedCostMap] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: leaderboardUserSelect,
    }),
    getRelationMap(viewerUserId, ids),
    needsEstimatedCost
      ? getEstimatedCostMapForUsers(ids, window)
      : Promise.resolve(new Map<string, number>()),
  ]);

  const userMap = new Map(users.map((user) => [user.id, user]));
  const entries: LeaderboardEntry[] = [];

  for (const summary of summaries) {
    const user = userMap.get(summary.userId);

    if (!user) {
      continue;
    }

    const flags = relationMap.get(summary.userId) ?? {
      isFollowing: false,
      followsYou: false,
    };

    entries.push({
      rank: summary.rank,
      userId: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      bio: user.usagePreference?.bio ?? null,
      estimatedCostUsd:
        summary.estimatedCostUsd > 0
          ? summary.estimatedCostUsd
          : (estimatedCostMap.get(summary.userId) ?? 0),
      totalTokens: summary.totalTokens,
      inputTokens: summary.inputTokens,
      outputTokens: summary.outputTokens,
      reasoningTokens: summary.reasoningTokens,
      cachedTokens: summary.cachedTokens,
      activeSeconds: summary.activeSeconds,
      sessions: summary.sessions,
      followerCount: user._count.followers,
      followingCount: user._count.following,
      isSelf: viewerUserId === user.id,
      isFollowing: flags.isFollowing,
      followsYou: flags.followsYou,
    });
  }

  return entries;
}

function isSnapshotFresh(input: {
  generatedAt: Date;
  snapshotWindow: LeaderboardWindow;
  requestedWindow: LeaderboardWindow;
  now: Date;
}) {
  return (
    sameLeaderboardWindow(input.snapshotWindow, input.requestedWindow) &&
    input.now.getTime() - input.generatedAt.getTime() <
      LEADERBOARD_SNAPSHOT_TTL_MS
  );
}

async function rebuildGlobalSnapshot(period: LeaderboardPeriod, now: Date) {
  const window = resolveLeaderboardWindow(period, now);
  const rows = await prisma.leaderboardUserDay.groupBy({
    by: ["userId"],
    where: {
      ...buildWindowWhere(window),
      user: {
        usagePreference: {
          is: {
            publicProfileEnabled: true,
          },
        },
      },
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      reasoningTokens: true,
      cachedTokens: true,
      totalTokens: true,
      activeSeconds: true,
      sessions: true,
    },
    orderBy: [
      {
        _sum: {
          totalTokens: "desc",
        },
      },
      {
        userId: "asc",
      },
    ],
    take: LEADERBOARD_SNAPSHOT_LIMIT,
  });

  const summaries = rows
    .map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      inputTokens: tokenCountToNumber(row._sum.inputTokens),
      outputTokens: tokenCountToNumber(row._sum.outputTokens),
      reasoningTokens: tokenCountToNumber(row._sum.reasoningTokens),
      cachedTokens: tokenCountToNumber(row._sum.cachedTokens),
      totalTokens: tokenCountToNumber(row._sum.totalTokens),
      estimatedCostUsd: 0,
      activeSeconds: coerceInt(row._sum.activeSeconds),
      sessions: coerceInt(row._sum.sessions),
    }))
    .filter((row) => row.totalTokens > 0);

  const snapshot = await prisma.$transaction(async (tx) => {
    const nextSnapshot = await tx.leaderboardSnapshot.upsert({
      where: {
        period,
      },
      update: {
        windowStart: window.start,
        windowEnd: window.end,
        generatedAt: now,
      },
      create: {
        period,
        windowStart: window.start,
        windowEnd: window.end,
        generatedAt: now,
      },
    });

    await tx.leaderboardSnapshotEntry.deleteMany({
      where: {
        snapshotId: nextSnapshot.id,
      },
    });

    if (summaries.length > 0) {
      await tx.leaderboardSnapshotEntry.createMany({
        data: summaries.map((row) => ({
          snapshotId: nextSnapshot.id,
          userId: row.userId,
          rank: row.rank,
          inputTokens: tokenCountToBigInt(row.inputTokens),
          outputTokens: tokenCountToBigInt(row.outputTokens),
          reasoningTokens: tokenCountToBigInt(row.reasoningTokens),
          cachedTokens: tokenCountToBigInt(row.cachedTokens),
          totalTokens: tokenCountToBigInt(row.totalTokens),
          activeSeconds: row.activeSeconds,
          sessions: row.sessions,
        })),
      });
    }

    return nextSnapshot;
  });

  return {
    snapshot,
    summaries,
    window,
  };
}

async function ensureGlobalSnapshot(period: LeaderboardPeriod, now: Date) {
  const requestedWindow = resolveLeaderboardWindow(period, now);
  const existing = await prisma.leaderboardSnapshot.findUnique({
    where: {
      period,
    },
  });

  if (
    existing &&
    isSnapshotFresh({
      generatedAt: existing.generatedAt,
      snapshotWindow: {
        start: existing.windowStart,
        end: existing.windowEnd,
      },
      requestedWindow,
      now,
    })
  ) {
    const rows = await prisma.leaderboardSnapshotEntry.findMany({
      where: {
        snapshotId: existing.id,
      },
      orderBy: {
        rank: "asc",
      },
      take: LEADERBOARD_PAGE_LIMIT,
    });

    return {
      snapshot: existing,
      window: requestedWindow,
      summaries: rows.map((row) => ({
        rank: row.rank,
        userId: row.userId,
        inputTokens: tokenCountToNumber(row.inputTokens),
        outputTokens: tokenCountToNumber(row.outputTokens),
        reasoningTokens: tokenCountToNumber(row.reasoningTokens),
        cachedTokens: tokenCountToNumber(row.cachedTokens),
        totalTokens: tokenCountToNumber(row.totalTokens),
        estimatedCostUsd: 0,
        activeSeconds: row.activeSeconds,
        sessions: row.sessions,
      })),
    };
  }

  return rebuildGlobalSnapshot(period, now);
}

async function getGlobalCostRankedSummaries(
  period: LeaderboardPeriod,
  now: Date,
  limit = LEADERBOARD_PAGE_LIMIT,
) {
  const window = resolveLeaderboardWindow(period, now);
  const [catalog, groupedRows] = await Promise.all([
    getPricingCatalog(),
    prisma.usageBucket.groupBy({
      by: ["userId", "model"],
      where: {
        ...buildBucketWindowWhere(window),
        user: {
          usagePreference: {
            is: {
              publicProfileEnabled: true,
            },
          },
        },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        reasoningTokens: true,
        cachedTokens: true,
        totalTokens: true,
      },
    }),
  ]);

  const aggregates = buildUserUsageAggregates(groupedRows, catalog);
  const statsMap = await getLeaderboardDayStatsMap(
    Array.from(aggregates.keys()),
    window,
  );

  return {
    generatedAt: now,
    window,
    summaries: rankSummaries(
      aggregates.values(),
      statsMap,
      "estimated_cost",
      limit,
    ),
  };
}

async function getFollowingCostRankedSummaries(input: {
  period: LeaderboardPeriod;
  viewerUserId: string;
  followTag: FollowTagFilter;
  now: Date;
}) {
  const ids = await getFollowingNetworkIds(input.viewerUserId, input.followTag);
  const window = resolveLeaderboardWindow(input.period, input.now);

  if (ids.length === 0) {
    return {
      generatedAt: input.now,
      window,
      summaries: [] as LeaderboardEntrySummary[],
    };
  }

  const [catalog, groupedRows] = await Promise.all([
    getPricingCatalog(),
    prisma.usageBucket.groupBy({
      by: ["userId", "model"],
      where: {
        ...buildBucketWindowWhere(window),
        userId: {
          in: ids,
        },
        OR: [
          {
            userId: input.viewerUserId,
          },
          {
            user: {
              usagePreference: {
                is: {
                  publicProfileEnabled: true,
                },
              },
            },
          },
        ],
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        reasoningTokens: true,
        cachedTokens: true,
        totalTokens: true,
      },
    }),
  ]);

  const aggregates = buildUserUsageAggregates(groupedRows, catalog);
  const statsMap = await getLeaderboardDayStatsMap(
    Array.from(aggregates.keys()),
    window,
  );

  return {
    generatedAt: input.now,
    window,
    summaries: rankSummaries(
      aggregates.values(),
      statsMap,
      "estimated_cost",
      LEADERBOARD_PAGE_LIMIT,
    ),
  };
}

async function getGlobalViewerRankSummary(input: {
  period: LeaderboardPeriod;
  metric: LeaderboardMetric;
  viewerUserId: string;
  now: Date;
}) {
  if (input.metric === "estimated_cost") {
    const { summaries, window } = await getGlobalCostRankedSummaries(
      input.period,
      input.now,
      Number.MAX_SAFE_INTEGER,
    );
    const summary = summaries.find(
      (entry) => entry.userId === input.viewerUserId,
    );

    return summary ? { summary, window } : null;
  }

  const window = resolveLeaderboardWindow(input.period, input.now);
  const rows = await prisma.leaderboardUserDay.groupBy({
    by: ["userId"],
    where: {
      ...buildWindowWhere(window),
      user: {
        usagePreference: {
          is: {
            publicProfileEnabled: true,
          },
        },
      },
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      reasoningTokens: true,
      cachedTokens: true,
      totalTokens: true,
      activeSeconds: true,
      sessions: true,
    },
  });

  const summaries = rankLeaderboardSummaries(
    rows.map((row) => ({
      rank: 0,
      userId: row.userId,
      inputTokens: tokenCountToNumber(row._sum.inputTokens),
      outputTokens: tokenCountToNumber(row._sum.outputTokens),
      reasoningTokens: tokenCountToNumber(row._sum.reasoningTokens),
      cachedTokens: tokenCountToNumber(row._sum.cachedTokens),
      totalTokens: tokenCountToNumber(row._sum.totalTokens),
      estimatedCostUsd: 0,
      activeSeconds: coerceInt(row._sum.activeSeconds),
      sessions: coerceInt(row._sum.sessions),
    })),
    "total_tokens",
    Number.MAX_SAFE_INTEGER,
  );
  const summary = summaries.find(
    (entry) => entry.userId === input.viewerUserId,
  );

  return summary ? { summary, window } : null;
}

export async function getGlobalLeaderboard(input: {
  period: LeaderboardPeriod;
  metric: LeaderboardMetric;
  viewerUserId?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  if (input.metric === "estimated_cost") {
    const { generatedAt, summaries, window } =
      await getGlobalCostRankedSummaries(input.period, now);
    const entries = await hydrateEntries(summaries, window, input.viewerUserId);

    return toDataset({
      scope: "global",
      period: input.period,
      generatedAt,
      window,
      entries,
    });
  }

  const { snapshot, summaries, window } = await ensureGlobalSnapshot(
    input.period,
    now,
  );
  const entries = await hydrateEntries(summaries, window, input.viewerUserId);

  return toDataset({
    scope: "global",
    period: input.period,
    generatedAt: snapshot.generatedAt,
    window,
    entries,
  });
}

export async function getFollowingLeaderboard(input: {
  period: LeaderboardPeriod;
  metric: LeaderboardMetric;
  viewerUserId: string;
  followTag?: FollowTagFilter;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const followTag = input.followTag ?? "all";

  if (input.metric === "estimated_cost") {
    const { generatedAt, summaries, window } =
      await getFollowingCostRankedSummaries({
        period: input.period,
        viewerUserId: input.viewerUserId,
        followTag,
        now,
      });
    const entries = await hydrateEntries(summaries, window, input.viewerUserId);

    return toDataset({
      scope: "following",
      period: input.period,
      generatedAt,
      window,
      entries,
    });
  }

  const ids = await getFollowingNetworkIds(input.viewerUserId, followTag);
  const window = resolveLeaderboardWindow(input.period, now);

  if (ids.length === 0) {
    return toDataset({
      scope: "following",
      period: input.period,
      generatedAt: null,
      window,
      entries: [],
    });
  }

  const rows = await prisma.leaderboardUserDay.groupBy({
    by: ["userId"],
    where: {
      ...buildWindowWhere(window),
      userId: {
        in: ids,
      },
      OR: [
        {
          userId: input.viewerUserId,
        },
        {
          user: {
            usagePreference: {
              is: {
                publicProfileEnabled: true,
              },
            },
          },
        },
      ],
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      reasoningTokens: true,
      cachedTokens: true,
      totalTokens: true,
      activeSeconds: true,
      sessions: true,
    },
    orderBy: [
      {
        _sum: {
          totalTokens: "desc",
        },
      },
      {
        userId: "asc",
      },
    ],
    take: LEADERBOARD_PAGE_LIMIT,
  });

  const summaries = rows
    .map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      inputTokens: tokenCountToNumber(row._sum.inputTokens),
      outputTokens: tokenCountToNumber(row._sum.outputTokens),
      reasoningTokens: tokenCountToNumber(row._sum.reasoningTokens),
      cachedTokens: tokenCountToNumber(row._sum.cachedTokens),
      totalTokens: tokenCountToNumber(row._sum.totalTokens),
      estimatedCostUsd: 0,
      activeSeconds: coerceInt(row._sum.activeSeconds),
      sessions: coerceInt(row._sum.sessions),
    }))
    .filter((row) => row.totalTokens > 0);
  const entries = await hydrateEntries(summaries, window, input.viewerUserId);

  return toDataset({
    scope: "following",
    period: input.period,
    generatedAt: now,
    window,
    entries,
  });
}

export async function getLeaderboardPageData(input: {
  period: LeaderboardPeriod;
  metric: LeaderboardMetric;
  viewerUserId?: string | null;
  followTag?: FollowTagFilter;
  now?: Date;
}): Promise<LeaderboardPageData> {
  const now = input.now ?? new Date();
  await finalizePendingLeaderboardPeriods(now);
  const [global, following, viewerPreference] = await Promise.all([
    getGlobalLeaderboard({
      period: input.period,
      metric: input.metric,
      viewerUserId: input.viewerUserId,
      now,
    }),
    input.viewerUserId
      ? getFollowingLeaderboard({
          period: input.period,
          metric: input.metric,
          viewerUserId: input.viewerUserId,
          followTag: input.followTag,
          now,
        })
      : Promise.resolve(null),
    input.viewerUserId
      ? prisma.usagePreference.findUnique({
          where: {
            userId: input.viewerUserId,
          },
          select: {
            publicProfileEnabled: true,
          },
        })
      : Promise.resolve(null),
  ]);
  const viewerUserId = input.viewerUserId ?? null;
  const viewerGlobalEntry =
    viewerUserId &&
    viewerPreference?.publicProfileEnabled &&
    global.entries.every((entry) => entry.userId !== viewerUserId)
      ? await (async () => {
          const rankedViewer = await getGlobalViewerRankSummary({
            period: input.period,
            metric: input.metric,
            viewerUserId,
            now,
          });

          if (!rankedViewer) {
            return null;
          }

          const [entry] = await hydrateEntries(
            [rankedViewer.summary],
            rankedViewer.window,
            viewerUserId,
          );

          return entry ?? null;
        })()
      : null;

  return {
    global,
    following,
    viewerGlobalEntry,
    viewerPublicProfileEnabled: viewerPreference?.publicProfileEnabled ?? null,
  };
}
