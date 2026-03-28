import { prisma } from "@/lib/prisma";
import { resolveLeaderboardWindow, sameLeaderboardWindow } from "./date";
import type {
  LeaderboardDataset,
  LeaderboardEntry,
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
  activeSeconds: number;
  sessions: number;
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

async function hydrateEntries(
  summaries: LeaderboardEntrySummary[],
  viewerUserId?: string | null,
) {
  if (summaries.length === 0) {
    return [];
  }

  const ids = summaries.map((entry) => entry.userId);
  const [users, relationMap] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: leaderboardUserSelect,
    }),
    getRelationMap(viewerUserId, ids),
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
      inputTokens: coerceInt(row._sum.inputTokens),
      outputTokens: coerceInt(row._sum.outputTokens),
      reasoningTokens: coerceInt(row._sum.reasoningTokens),
      cachedTokens: coerceInt(row._sum.cachedTokens),
      totalTokens: coerceInt(row._sum.totalTokens),
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
          inputTokens: row.inputTokens,
          outputTokens: row.outputTokens,
          reasoningTokens: row.reasoningTokens,
          cachedTokens: row.cachedTokens,
          totalTokens: row.totalTokens,
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
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        reasoningTokens: row.reasoningTokens,
        cachedTokens: row.cachedTokens,
        totalTokens: row.totalTokens,
        activeSeconds: row.activeSeconds,
        sessions: row.sessions,
      })),
    };
  }

  return rebuildGlobalSnapshot(period, now);
}

export async function getGlobalLeaderboard(input: {
  period: LeaderboardPeriod;
  viewerUserId?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const { snapshot, summaries, window } = await ensureGlobalSnapshot(
    input.period,
    now,
  );
  const entries = await hydrateEntries(summaries, input.viewerUserId);

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
  viewerUserId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const following = await prisma.follow.findMany({
    where: {
      followerId: input.viewerUserId,
    },
    select: {
      followingId: true,
    },
  });

  const ids = Array.from(
    new Set([input.viewerUserId, ...following.map((row) => row.followingId)]),
  );
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
      inputTokens: coerceInt(row._sum.inputTokens),
      outputTokens: coerceInt(row._sum.outputTokens),
      reasoningTokens: coerceInt(row._sum.reasoningTokens),
      cachedTokens: coerceInt(row._sum.cachedTokens),
      totalTokens: coerceInt(row._sum.totalTokens),
      activeSeconds: coerceInt(row._sum.activeSeconds),
      sessions: coerceInt(row._sum.sessions),
    }))
    .filter((row) => row.totalTokens > 0);
  const entries = await hydrateEntries(summaries, input.viewerUserId);

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
  viewerUserId?: string | null;
  now?: Date;
}): Promise<LeaderboardPageData> {
  const now = input.now ?? new Date();
  const [global, following, viewerPreference] = await Promise.all([
    getGlobalLeaderboard({
      period: input.period,
      viewerUserId: input.viewerUserId,
      now,
    }),
    input.viewerUserId
      ? getFollowingLeaderboard({
          period: input.period,
          viewerUserId: input.viewerUserId,
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

  return {
    global,
    following,
    viewerPublicProfileEnabled: viewerPreference?.publicProfileEnabled ?? null,
  };
}
