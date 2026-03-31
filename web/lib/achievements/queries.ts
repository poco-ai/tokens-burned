import { getUserGlobalLeaderboardRanksByTotalTokens } from "@/lib/leaderboard/rank";
import type { PricingCatalog } from "@/lib/pricing/catalog";
import { getPricingCatalog } from "@/lib/pricing/catalog";
import {
  estimateCostUsd,
  resolveOfficialPricingMatch,
} from "@/lib/pricing/resolve";
import { prisma } from "@/lib/prisma";
import { resolveDashboardRange } from "@/lib/usage/date-range";
import { formatDateInput } from "@/lib/usage/format";
import { getUsagePreference } from "@/lib/usage/preferences";
import type { UsageShareCardPersona } from "@/lib/usage/share-card";
import {
  type AchievementDistinctTimelinePoint,
  type AchievementInputMetrics,
  type AchievementTimelinePoint,
  buildAchievementNotificationData,
  buildAchievementsPageData,
} from "./evaluate";
import type {
  AchievementNotificationData,
  AchievementsPageData,
} from "./types";

function latestIso(values: Array<string | null | undefined>) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => !Number.isNaN(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function sortIsoAsc<T extends { at: string }>(values: T[]) {
  return [...values].sort(
    (left, right) => Date.parse(left.at) - Date.parse(right.at),
  );
}

function estimateBucketCostUsd(
  bucket: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cachedTokens: number;
  },
  catalog: PricingCatalog,
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

function resolveCurrentPersona(input: {
  totalTokens: number;
  totalSessions: number;
  reasoningShare: number;
  cacheShare: number;
  topProjectShare: number;
  topModelShare: number;
  modelDiversity: number;
}): UsageShareCardPersona | null {
  if (input.totalTokens <= 0 && input.totalSessions <= 0) {
    return null;
  }

  const averageTokensPerSession =
    input.totalSessions > 0 ? input.totalTokens / input.totalSessions : 0;

  if (input.reasoningShare >= 0.28) {
    return "reasoning_master";
  }

  if (input.cacheShare >= 0.18) {
    return "cache_guardian";
  }

  if (input.topProjectShare >= 0.68) {
    return "project_deep_diver";
  }

  if (input.modelDiversity >= 3 && input.topModelShare <= 0.62) {
    return "model_orchestrator";
  }

  if (input.totalSessions >= 10 && averageTokensPerSession <= 120_000) {
    return "rapid_shipper";
  }

  return "steady_builder";
}

function buildDistinctTimeline(
  rows: Array<{ at: string; key: string | null | undefined }>,
): AchievementDistinctTimelinePoint[] {
  return sortIsoAsc(
    rows
      .filter((row) => Boolean(row.key))
      .map((row) => ({
        at: row.at,
        key: row.key ?? "",
      })),
  );
}

function buildAllTimeMetrics(input: {
  timezone: string;
  buckets: Array<{
    bucketStart: Date;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cachedTokens: number;
    model: string;
    source: string;
    projectKey: string;
    deviceId: string;
  }>;
  sessions: Array<{
    firstMessageAt: Date;
    activeSeconds: number;
    deviceId: string;
  }>;
  following: Array<{ followingId: string; createdAt: Date }>;
  followers: Array<{ followerId: string; createdAt: Date }>;
  publicProfileEnabled: boolean;
  publicProfileUpdatedAt: Date | null;
  leaderboardRanks?: {
    day: number | null;
    week: number | null;
    month: number | null;
    all_time: number | null;
  };
  costTimeline: AchievementTimelinePoint[];
  totalEstimatedCostUsd: number;
}): AchievementInputMetrics {
  const leaderboardRanks = input.leaderboardRanks ?? {
    day: null,
    week: null,
    month: null,
    all_time: null,
  };
  const tokenTimeline: AchievementTimelinePoint[] = sortIsoAsc(
    input.buckets.map((bucket) => ({
      at: bucket.bucketStart.toISOString(),
      value: bucket.totalTokens,
    })),
  );
  const costTimeline = input.costTimeline;
  const sessionTimeline: AchievementTimelinePoint[] = sortIsoAsc(
    input.sessions.map((session) => ({
      at: session.firstMessageAt.toISOString(),
      value: 1,
    })),
  );
  const activeSecondsTimeline: AchievementTimelinePoint[] = sortIsoAsc(
    input.sessions.map((session) => ({
      at: session.firstMessageAt.toISOString(),
      value: session.activeSeconds,
    })),
  );
  const modelTimeline = buildDistinctTimeline(
    input.buckets.map((bucket) => ({
      at: bucket.bucketStart.toISOString(),
      key: bucket.model,
    })),
  );
  const toolTimeline = buildDistinctTimeline(
    input.buckets.map((bucket) => ({
      at: bucket.bucketStart.toISOString(),
      key: bucket.source,
    })),
  );
  const projectTimeline = buildDistinctTimeline(
    input.buckets.map((bucket) => ({
      at: bucket.bucketStart.toISOString(),
      key: bucket.projectKey,
    })),
  );
  const deviceTimeline = buildDistinctTimeline([
    ...input.buckets.map((bucket) => ({
      at: bucket.bucketStart.toISOString(),
      key: bucket.deviceId,
    })),
    ...input.sessions.map((session) => ({
      at: session.firstMessageAt.toISOString(),
      key: session.deviceId,
    })),
  ]);

  const activityDayKeys = new Set<string>();

  for (const bucket of input.buckets) {
    activityDayKeys.add(formatDateInput(bucket.bucketStart, input.timezone));
  }

  for (const session of input.sessions) {
    activityDayKeys.add(
      formatDateInput(session.firstMessageAt, input.timezone),
    );
  }

  const sortedActivityDayKeys = Array.from(activityDayKeys).sort(
    (left, right) => left.localeCompare(right),
  );

  const now = new Date();
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const followingMap = new Map(
    input.following.map(
      (record) => [record.followingId, record.createdAt] as const,
    ),
  );
  const mutualEffectiveDates = input.followers
    .map((record) => {
      const followingAt = followingMap.get(record.followerId);

      if (!followingAt) {
        return null;
      }

      return new Date(
        Math.max(followingAt.getTime(), record.createdAt.getTime()),
      ).toISOString();
    })
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(left) - Date.parse(right));

  const recentRange = resolveDashboardRange({
    preset: "30d",
    timezone: input.timezone,
    now,
  });
  const recentBuckets = input.buckets.filter(
    (bucket) =>
      bucket.bucketStart.getTime() >= recentRange.from.getTime() &&
      bucket.bucketStart.getTime() <= recentRange.to.getTime(),
  );
  const recentSessions = input.sessions.filter(
    (session) =>
      session.firstMessageAt.getTime() >= recentRange.from.getTime() &&
      session.firstMessageAt.getTime() <= recentRange.to.getTime(),
  );

  const recentTotals = recentBuckets.reduce(
    (result, bucket) => {
      result.totalTokens += bucket.totalTokens;
      result.reasoningTokens += bucket.reasoningTokens;
      result.cachedTokens += bucket.cachedTokens;
      result.byProject.set(
        bucket.projectKey,
        (result.byProject.get(bucket.projectKey) ?? 0) + bucket.totalTokens,
      );
      result.byModel.set(
        bucket.model,
        (result.byModel.get(bucket.model) ?? 0) + bucket.totalTokens,
      );
      return result;
    },
    {
      totalTokens: 0,
      reasoningTokens: 0,
      cachedTokens: 0,
      byProject: new Map<string, number>(),
      byModel: new Map<string, number>(),
    },
  );

  const topProjectTokens = Math.max(0, ...recentTotals.byProject.values());
  const topModelTokens = Math.max(0, ...recentTotals.byModel.values());
  const totalTokens30d = recentTotals.totalTokens;
  const reasoningShare30d =
    totalTokens30d > 0 ? recentTotals.reasoningTokens / totalTokens30d : 0;
  const cacheShare30d =
    totalTokens30d > 0 ? recentTotals.cachedTokens / totalTokens30d : 0;
  const topProjectShare30d =
    totalTokens30d > 0 ? topProjectTokens / totalTokens30d : 0;
  const topModelShare30d =
    totalTokens30d > 0 ? topModelTokens / totalTokens30d : 0;
  const currentPersona = resolveCurrentPersona({
    totalTokens: totalTokens30d,
    totalSessions: recentSessions.length,
    reasoningShare: reasoningShare30d,
    cacheShare: cacheShare30d,
    topProjectShare: topProjectShare30d,
    topModelShare: topModelShare30d,
    modelDiversity: recentTotals.byModel.size,
  });

  return {
    timezone: input.timezone,
    firstSyncAt: latestIso([
      tokenTimeline[0]?.at ?? null,
      sessionTimeline[0]?.at ?? null,
    ])
      ? ([tokenTimeline[0]?.at, sessionTimeline[0]?.at]
          .filter((value): value is string => Boolean(value))
          .sort((left, right) => Date.parse(left) - Date.parse(right))[0] ??
        null)
      : null,
    publicProfileEnabled: input.publicProfileEnabled,
    publicProfileUpdatedAt: input.publicProfileUpdatedAt?.toISOString() ?? null,
    activeDayKeys: sortedActivityDayKeys,
    todayKey: formatDateInput(now, input.timezone),
    yesterdayKey: formatDateInput(yesterday, input.timezone),
    totalTokens: input.buckets.reduce(
      (sum, bucket) => sum + bucket.totalTokens,
      0,
    ),
    totalSessions: input.sessions.length,
    totalActiveSeconds: input.sessions.reduce(
      (sum, session) => sum + session.activeSeconds,
      0,
    ),
    tokenTimeline,
    costTimeline,
    totalEstimatedCostUsd: input.totalEstimatedCostUsd,
    sessionTimeline,
    activeSecondsTimeline,
    modelTimeline,
    toolTimeline,
    projectTimeline,
    deviceTimeline,
    reasoningShare30d,
    cacheShare30d,
    topProjectShare30d,
    recentWindowUnlockedAt: latestIso([
      recentBuckets.at(-1)?.bucketStart.toISOString() ?? null,
      recentSessions.at(-1)?.firstMessageAt.toISOString() ?? null,
    ]),
    followingCount: input.following.length,
    firstFollowingAt: input.following[0]?.createdAt.toISOString() ?? null,
    followingTimeline: input.following.map((record) =>
      record.createdAt.toISOString(),
    ),
    followerCount: input.followers.length,
    firstFollowerAt: input.followers[0]?.createdAt.toISOString() ?? null,
    followerTimeline: input.followers.map((record) =>
      record.createdAt.toISOString(),
    ),
    mutualCount: mutualEffectiveDates.length,
    mutualReachedAt: mutualEffectiveDates[2] ?? null,
    mutualTimeline: mutualEffectiveDates,
    currentPersona,
    leaderboardDayRank: leaderboardRanks.day,
    leaderboardWeekRank: leaderboardRanks.week,
    leaderboardMonthRank: leaderboardRanks.month,
    leaderboardAllTimeRank: leaderboardRanks.all_time,
  };
}

async function loadAchievementMetrics(userId: string) {
  const preference = await getUsagePreference(userId);
  const [user, buckets, sessions, following, followers, catalog] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          usagePreference: {
            select: {
              publicProfileEnabled: true,
              updatedAt: true,
            },
          },
        },
      }),
      prisma.usageBucket.findMany({
        where: { userId },
        select: {
          bucketStart: true,
          totalTokens: true,
          inputTokens: true,
          outputTokens: true,
          reasoningTokens: true,
          cachedTokens: true,
          model: true,
          source: true,
          projectKey: true,
          deviceId: true,
        },
        orderBy: { bucketStart: "asc" },
      }),
      prisma.usageSession.findMany({
        where: { userId },
        select: {
          firstMessageAt: true,
          activeSeconds: true,
          deviceId: true,
        },
        orderBy: { firstMessageAt: "asc" },
      }),
      prisma.follow.findMany({
        where: { followerId: userId },
        select: {
          followingId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.follow.findMany({
        where: { followingId: userId },
        select: {
          followerId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      getPricingCatalog(),
    ]);

  const costTimeline = sortIsoAsc(
    buckets.map((bucket) => ({
      at: bucket.bucketStart.toISOString(),
      value: estimateBucketCostUsd(bucket, catalog),
    })),
  );
  const totalEstimatedCostUsd = costTimeline.reduce(
    (sum, point) => sum + point.value,
    0,
  );

  const publicProfileEnabled =
    user.usagePreference?.publicProfileEnabled ?? false;
  const leaderboardRanks =
    await getUserGlobalLeaderboardRanksByTotalTokens(userId);

  return buildAllTimeMetrics({
    timezone: preference.timezone,
    buckets,
    sessions,
    following,
    followers,
    publicProfileEnabled,
    publicProfileUpdatedAt: user.usagePreference?.updatedAt ?? null,
    leaderboardRanks,
    costTimeline,
    totalEstimatedCostUsd,
  });
}

export async function getAchievementsPageData(
  userId: string,
): Promise<AchievementsPageData> {
  const metrics = await loadAchievementMetrics(userId);
  return buildAchievementsPageData(metrics);
}

export async function getAchievementArenaSummary(userId: string): Promise<{
  score: number;
  level: number;
}> {
  const metrics = await loadAchievementMetrics(userId);
  const pageData = buildAchievementsPageData(metrics);
  return {
    score: pageData.summary.score,
    level: pageData.summary.level,
  };
}

export async function getAchievementNotificationData(
  userId: string,
): Promise<AchievementNotificationData> {
  const metrics = await loadAchievementMetrics(userId);
  return buildAchievementNotificationData(buildAchievementsPageData(metrics));
}
