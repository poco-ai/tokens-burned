import { normalizeUsername } from "@/lib/auth-username";
import { getPricingCatalog } from "@/lib/pricing/catalog";
import {
  estimateCostUsd,
  resolveOfficialPricingMatch,
} from "@/lib/pricing/resolve";
import { prisma } from "@/lib/prisma";
import {
  groupByHourOrDay,
  listRangeBuckets,
  resolveDashboardRange,
} from "@/lib/usage/date-range";
import { formatDateInput } from "@/lib/usage/format";
import type { FollowTag } from "./follow-tags";

const DAY_MS = 24 * 60 * 60 * 1000;

const profileUserSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
  createdAt: true,
  usagePreference: {
    select: {
      bio: true,
      timezone: true,
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

type ProfileUserRecord = Awaited<{
  id: string;
  name: string;
  username: string;
  image: string | null;
  createdAt: Date;
  usagePreference: {
    bio: string | null;
    timezone: string;
    publicProfileEnabled: boolean;
  } | null;
  _count: {
    followers: number;
    following: number;
  };
} | null>;

export type SocialListProfile = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  bio: string | null;
  publicProfileEnabled: boolean;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  followTag: FollowTag | null;
  followsYou: boolean;
  isSelf: boolean;
};

export type ProfileHeatmapDay = {
  date: string;
  activeSeconds: number;
  sessions: number;
  totalTokens: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export type PublicProfilePageData = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  bio: string | null;
  createdAt: Date;
  publicProfileEnabled: boolean;
  timezone: string;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  followTag: FollowTag | null;
  followsYou: boolean;
  isSelf: boolean;
  overview: {
    totalTokens: number;
    estimatedCostUsd: number;
    activeSeconds: number;
    sessions: number;
    activeDays: number;
  };
  heatmap: ProfileHeatmapDay[];
  topTools: Array<{
    name: string;
    totalTokens: number;
    share: number;
  }>;
  topModels: Array<{
    name: string;
    totalTokens: number;
    share: number;
  }>;
};

type RelationFlags = {
  isFollowing: boolean;
  followTag: FollowTag | null;
  followsYou: boolean;
};

function createDailyRange(timezone: string, days: number) {
  const now = new Date();

  return resolveDashboardRange({
    preset: "custom",
    timezone,
    from: formatDateInput(
      new Date(now.getTime() - (days - 1) * DAY_MS),
      timezone,
    ),
    to: formatDateInput(now, timezone),
  });
}

function mapRelationFlags(
  ids: string[],
  direct: Array<{ followingId: string; tag: FollowTag | null }>,
  reverse: Array<{ followerId: string }>,
) {
  const followingMap = new Map(
    direct.map((record) => [record.followingId, record.tag] as const),
  );
  const followerIds = new Set(reverse.map((record) => record.followerId));

  return new Map<string, RelationFlags>(
    ids.map((id) => [
      id,
      {
        isFollowing: followingMap.has(id),
        followTag: followingMap.get(id) ?? null,
        followsYou: followerIds.has(id),
      },
    ]),
  );
}

function mapUserToListProfile(
  user: NonNullable<ProfileUserRecord>,
  relationFlags: RelationFlags,
  viewerUserId?: string | null,
): SocialListProfile {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    image: user.image,
    bio: user.usagePreference?.bio ?? null,
    publicProfileEnabled: user.usagePreference?.publicProfileEnabled ?? false,
    followerCount: user._count.followers,
    followingCount: user._count.following,
    isFollowing: relationFlags.isFollowing,
    followTag: relationFlags.followTag,
    followsYou: relationFlags.followsYou,
    isSelf: viewerUserId === user.id,
  };
}

async function getRelationFlags(
  viewerUserId: string | null | undefined,
  targetUserId: string,
): Promise<RelationFlags> {
  if (!viewerUserId || viewerUserId === targetUserId) {
    return {
      isFollowing: false,
      followTag: null,
      followsYou: false,
    };
  }

  const [isFollowing, followsYou] = await Promise.all([
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerUserId,
          followingId: targetUserId,
        },
      },
      select: { id: true, tag: true },
    }),
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: targetUserId,
          followingId: viewerUserId,
        },
      },
      select: { id: true },
    }),
  ]);

  return {
    isFollowing: Boolean(isFollowing),
    followTag: isFollowing?.tag ?? null,
    followsYou: Boolean(followsYou),
  };
}

function buildHeatmap(
  timezone: string,
  sessions: Array<{
    firstMessageAt: Date;
    activeSeconds: number;
  }>,
  buckets: Array<{
    bucketStart: Date;
    totalTokens: number;
  }>,
) {
  const range = createDailyRange(timezone, 365);
  const seeded = new Map<string, ProfileHeatmapDay>(
    listRangeBuckets(range).map((bucket) => [
      bucket.key,
      {
        date: bucket.key,
        activeSeconds: 0,
        sessions: 0,
        totalTokens: 0,
        level: 0,
      },
    ]),
  );

  for (const session of sessions) {
    const key = groupByHourOrDay(range, session.firstMessageAt);
    const day = seeded.get(key);

    if (!day) {
      continue;
    }

    day.activeSeconds += session.activeSeconds;
    day.sessions += 1;
  }

  for (const bucket of buckets) {
    const key = groupByHourOrDay(range, bucket.bucketStart);
    const day = seeded.get(key);

    if (!day) {
      continue;
    }

    day.totalTokens += bucket.totalTokens;
  }

  const values = Array.from(seeded.values());
  const maxValue = Math.max(...values.map((day) => day.activeSeconds), 0);

  for (const day of values) {
    if (day.activeSeconds <= 0 || maxValue <= 0) {
      day.level = 0;
      continue;
    }

    day.level = Math.min(
      4,
      Math.max(1, Math.ceil((day.activeSeconds / maxValue) * 4)),
    ) as ProfileHeatmapDay["level"];
  }

  return values;
}

export async function getActivityHeatmap365(input: {
  userId: string;
  timezone: string;
}): Promise<ProfileHeatmapDay[]> {
  const range365 = createDailyRange(input.timezone, 365);
  const [sessions365, buckets365] = await Promise.all([
    prisma.usageSession.findMany({
      where: {
        userId: input.userId,
        firstMessageAt: {
          gte: range365.from,
          lte: range365.to,
        },
      },
      select: {
        firstMessageAt: true,
        activeSeconds: true,
      },
      orderBy: { firstMessageAt: "asc" },
    }),
    prisma.usageBucket.findMany({
      where: {
        userId: input.userId,
        bucketStart: {
          gte: range365.from,
          lte: range365.to,
        },
      },
      select: {
        bucketStart: true,
        totalTokens: true,
      },
      orderBy: { bucketStart: "asc" },
    }),
  ]);

  return buildHeatmap(input.timezone, sessions365, buckets365);
}

function buildTopTools(
  buckets: Array<{
    source: string;
    totalTokens: number;
  }>,
) {
  const rows = new Map<string, number>();

  for (const bucket of buckets) {
    rows.set(
      bucket.source,
      (rows.get(bucket.source) ?? 0) + bucket.totalTokens,
    );
  }

  const total = Array.from(rows.values()).reduce(
    (sum, value) => sum + value,
    0,
  );

  return Array.from(rows.entries())
    .map(([name, totalTokens]) => ({
      name,
      totalTokens,
      share: total === 0 ? 0 : totalTokens / total,
    }))
    .sort((left, right) => right.totalTokens - left.totalTokens)
    .slice(0, 5);
}

function buildTopModels(
  buckets: Array<{
    model: string;
    totalTokens: number;
  }>,
) {
  const rows = new Map<string, number>();

  for (const bucket of buckets) {
    rows.set(bucket.model, (rows.get(bucket.model) ?? 0) + bucket.totalTokens);
  }

  const total = Array.from(rows.values()).reduce(
    (sum, value) => sum + value,
    0,
  );

  return Array.from(rows.entries())
    .map(([name, totalTokens]) => ({
      name,
      totalTokens,
      share: total === 0 ? 0 : totalTokens / total,
    }))
    .sort((left, right) => right.totalTokens - left.totalTokens)
    .slice(0, 5);
}

function estimateBucketCostUsd(
  bucket: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cachedTokens: number;
  },
  catalog: Awaited<ReturnType<typeof getPricingCatalog>>,
) {
  const match = resolveOfficialPricingMatch(catalog, bucket.model);
  const estimate = estimateCostUsd(
    {
      inputTokens: bucket.inputTokens,
      outputTokens: bucket.outputTokens,
      reasoningTokens: bucket.reasoningTokens,
      cachedTokens: bucket.cachedTokens,
    },
    match?.cost,
  );

  return estimate?.totalUsd ?? 0;
}

export async function getPublicProfilePageData(input: {
  username: string;
  viewerUserId?: string | null;
}): Promise<PublicProfilePageData | null> {
  const user = await prisma.user.findUnique({
    where: {
      username: normalizeUsername(input.username),
    },
    select: profileUserSelect,
  });

  if (!user) {
    return null;
  }

  const publicProfileEnabled =
    user.usagePreference?.publicProfileEnabled ?? false;
  const isSelf = input.viewerUserId === user.id;

  if (!publicProfileEnabled && !isSelf) {
    return null;
  }

  const timezone = user.usagePreference?.timezone ?? "UTC";
  const range365 = createDailyRange(timezone, 365);
  const range30 = createDailyRange(timezone, 30);

  const [
    catalog,
    relationFlags,
    sessions365,
    buckets365,
    sessions30,
    buckets30,
  ] = await Promise.all([
    getPricingCatalog(),
    getRelationFlags(input.viewerUserId, user.id),
    prisma.usageSession.findMany({
      where: {
        userId: user.id,
        firstMessageAt: {
          gte: range365.from,
          lte: range365.to,
        },
      },
      select: {
        firstMessageAt: true,
        activeSeconds: true,
      },
      orderBy: { firstMessageAt: "asc" },
    }),
    prisma.usageBucket.findMany({
      where: {
        userId: user.id,
        bucketStart: {
          gte: range365.from,
          lte: range365.to,
        },
      },
      select: {
        bucketStart: true,
        totalTokens: true,
      },
      orderBy: { bucketStart: "asc" },
    }),
    prisma.usageSession.findMany({
      where: {
        userId: user.id,
        firstMessageAt: {
          gte: range30.from,
          lte: range30.to,
        },
      },
      select: {
        activeSeconds: true,
      },
    }),
    prisma.usageBucket.findMany({
      where: {
        userId: user.id,
        bucketStart: {
          gte: range30.from,
          lte: range30.to,
        },
      },
      select: {
        source: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        reasoningTokens: true,
        cachedTokens: true,
        totalTokens: true,
      },
    }),
  ]);

  const heatmap = buildHeatmap(timezone, sessions365, buckets365);
  const activeDays = heatmap
    .slice(-30)
    .filter((day) => day.activeSeconds > 0).length;

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    image: user.image,
    bio: user.usagePreference?.bio ?? null,
    createdAt: user.createdAt,
    publicProfileEnabled,
    timezone,
    followerCount: user._count.followers,
    followingCount: user._count.following,
    isFollowing: relationFlags.isFollowing,
    followTag: relationFlags.followTag,
    followsYou: relationFlags.followsYou,
    isSelf,
    overview: {
      totalTokens: buckets30.reduce(
        (sum, bucket) => sum + bucket.totalTokens,
        0,
      ),
      estimatedCostUsd: buckets30.reduce(
        (sum, bucket) => sum + estimateBucketCostUsd(bucket, catalog),
        0,
      ),
      activeSeconds: sessions30.reduce(
        (sum, session) => sum + session.activeSeconds,
        0,
      ),
      sessions: sessions30.length,
      activeDays,
    },
    heatmap,
    topTools: buildTopTools(buckets30),
    topModels: buildTopModels(buckets30),
  };
}

export async function searchPublicProfiles(input: {
  query?: string;
  viewerUserId?: string | null;
  limit?: number;
}) {
  const query = input.query?.trim();
  const users = await prisma.user.findMany({
    where: {
      AND: [
        input.viewerUserId
          ? {
              OR: [
                {
                  usagePreference: {
                    is: {
                      publicProfileEnabled: true,
                    },
                  },
                },
                {
                  id: input.viewerUserId,
                },
              ],
            }
          : {
              usagePreference: {
                is: {
                  publicProfileEnabled: true,
                },
              },
            },
        query
          ? {
              OR: [
                {
                  username: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  name: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {},
      ],
    },
    orderBy: query ? { username: "asc" } : { createdAt: "desc" },
    take: input.limit ?? (query ? 50 : 24),
    select: profileUserSelect,
  });

  const ids = users.map((user) => user.id);

  if (!input.viewerUserId || ids.length === 0) {
    return users.map((user) =>
      mapUserToListProfile(
        user,
        {
          isFollowing: false,
          followTag: null,
          followsYou: false,
        },
        input.viewerUserId,
      ),
    );
  }

  const [following, followers] = await Promise.all([
    prisma.follow.findMany({
      where: {
        followerId: input.viewerUserId,
        followingId: {
          in: ids,
        },
      },
      select: {
        followingId: true,
        tag: true,
      },
    }),
    prisma.follow.findMany({
      where: {
        followerId: {
          in: ids,
        },
        followingId: input.viewerUserId,
      },
      select: {
        followerId: true,
      },
    }),
  ]);

  const relationMap = mapRelationFlags(ids, following, followers);

  return users.map((user) =>
    mapUserToListProfile(
      user,
      relationMap.get(user.id) ?? {
        isFollowing: false,
        followTag: null,
        followsYou: false,
      },
      input.viewerUserId,
    ),
  );
}

export async function listFollowingProfiles(viewerUserId: string) {
  const rows = await prisma.follow.findMany({
    where: {
      followerId: viewerUserId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      tag: true,
      following: {
        select: profileUserSelect,
      },
    },
  });

  const ids = rows.map((row) => row.following.id);
  const reverse = await prisma.follow.findMany({
    where: {
      followerId: {
        in: ids,
      },
      followingId: viewerUserId,
    },
    select: {
      followerId: true,
    },
  });
  const reverseSet = new Set(reverse.map((record) => record.followerId));

  return rows.map((row) =>
    mapUserToListProfile(
      row.following,
      {
        isFollowing: true,
        followTag: row.tag,
        followsYou: reverseSet.has(row.following.id),
      },
      viewerUserId,
    ),
  );
}

export async function listFollowerProfiles(viewerUserId: string) {
  const rows = await prisma.follow.findMany({
    where: {
      followingId: viewerUserId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      follower: {
        select: profileUserSelect,
      },
    },
  });

  const ids = rows.map((row) => row.follower.id);
  const direct = await prisma.follow.findMany({
    where: {
      followerId: viewerUserId,
      followingId: {
        in: ids,
      },
    },
    select: {
      followingId: true,
      tag: true,
    },
  });
  const directMap = new Map(
    direct.map((record) => [record.followingId, record.tag] as const),
  );

  return rows.map((row) =>
    mapUserToListProfile(
      row.follower,
      {
        isFollowing: directMap.has(row.follower.id),
        followTag: directMap.get(row.follower.id) ?? null,
        followsYou: true,
      },
      viewerUserId,
    ),
  );
}
