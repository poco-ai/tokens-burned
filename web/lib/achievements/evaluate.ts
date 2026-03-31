import type { UsageShareCardPersona } from "@/lib/usage/share-card";
import { achievementDefinitionMap } from "./catalog";
import type {
  AchievementCategorySection,
  AchievementCode,
  AchievementNotificationData,
  AchievementStatus,
  AchievementsPageData,
} from "./types";
import { achievementCategories } from "./types";

export type AchievementTimelinePoint = {
  at: string;
  value: number;
};

export type AchievementDistinctTimelinePoint = {
  at: string;
  key: string;
};

export type AchievementInputMetrics = {
  timezone: string;
  firstSyncAt: string | null;
  publicProfileEnabled: boolean;
  publicProfileUpdatedAt: string | null;
  activeDayKeys: string[];
  todayKey: string;
  yesterdayKey: string;
  totalTokens: number;
  totalSessions: number;
  totalActiveSeconds: number;
  tokenTimeline: AchievementTimelinePoint[];
  costTimeline: AchievementTimelinePoint[];
  totalEstimatedCostUsd: number;
  sessionTimeline: AchievementTimelinePoint[];
  activeSecondsTimeline: AchievementTimelinePoint[];
  modelTimeline: AchievementDistinctTimelinePoint[];
  toolTimeline: AchievementDistinctTimelinePoint[];
  projectTimeline: AchievementDistinctTimelinePoint[];
  deviceTimeline: AchievementDistinctTimelinePoint[];
  reasoningShare30d: number;
  cacheShare30d: number;
  topProjectShare30d: number;
  recentWindowUnlockedAt: string | null;
  followingCount: number;
  firstFollowingAt: string | null;
  followingTimeline: string[];
  followerCount: number;
  firstFollowerAt: string | null;
  followerTimeline: string[];
  mutualCount: number;
  mutualReachedAt: string | null;
  mutualTimeline: string[];
  currentPersona: UsageShareCardPersona | null;
  leaderboardDayRank: number | null;
  leaderboardWeekRank: number | null;
  leaderboardMonthRank: number | null;
  leaderboardAllTimeRank: number | null;
};

function clampRatio(current: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, current / target));
}

function rankTierProgress(rank: number | null, maxRankInclusive: number) {
  if (rank === null) {
    return { current: 0, target: 1 };
  }

  if (rank <= maxRankInclusive) {
    return { current: maxRankInclusive - rank + 1, target: 1 };
  }

  return { current: 0, target: 1 };
}

function startOfDayIso(dateKey: string) {
  return `${dateKey}T00:00:00.000Z`;
}

function previousDateKey(dateKey: string) {
  const next = new Date(`${dateKey}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() - 1);
  return next.toISOString().slice(0, 10);
}

export function computeCurrentStreak(input: {
  activeDayKeys: string[];
  todayKey: string;
  yesterdayKey: string;
}) {
  const { activeDayKeys, todayKey, yesterdayKey } = input;

  if (activeDayKeys.length === 0) {
    return 0;
  }

  const latest = activeDayKeys[activeDayKeys.length - 1];

  if (latest !== todayKey && latest !== yesterdayKey) {
    return 0;
  }

  let streak = 1;

  for (let index = activeDayKeys.length - 1; index > 0; index -= 1) {
    const current = activeDayKeys[index];
    const expectedPrevious = previousDateKey(current);
    const actualPrevious = activeDayKeys[index - 1];

    if (actualPrevious !== expectedPrevious) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function nthDateIso(activeDayKeys: string[], count: number) {
  if (activeDayKeys.length < count) {
    return null;
  }

  return startOfDayIso(activeDayKeys[count - 1]);
}

function nthTimelineIso(timeline: string[], count: number) {
  if (timeline.length < count) {
    return null;
  }

  return timeline[count - 1];
}

function streakUnlockedAt(
  activeDayKeys: string[],
  streak: number,
  target: number,
) {
  if (streak < target || activeDayKeys.length < target) {
    return null;
  }

  return startOfDayIso(activeDayKeys[activeDayKeys.length - target]);
}

function cumulativeThresholdDate(
  timeline: AchievementTimelinePoint[],
  threshold: number,
) {
  let total = 0;

  for (const point of timeline) {
    total += point.value;

    if (total >= threshold) {
      return point.at;
    }
  }

  return null;
}

function distinctThresholdDate(
  timeline: AchievementDistinctTimelinePoint[],
  threshold: number,
) {
  const seen = new Set<string>();

  for (const point of timeline) {
    if (!point.key) {
      continue;
    }

    seen.add(point.key);

    if (seen.size >= threshold) {
      return point.at;
    }
  }

  return null;
}

function createStatus(input: {
  code: AchievementCode;
  current: number;
  target: number;
  unit: AchievementStatus["progress"]["unit"];
  unlockedAt: string | null;
}) {
  const definition = achievementDefinitionMap.get(input.code);

  if (!definition) {
    throw new Error(`Unknown achievement definition: ${input.code}`);
  }

  const unlocked = input.current >= input.target;

  return {
    ...definition,
    unlocked,
    unlockedAt: unlocked ? input.unlockedAt : null,
    progress: {
      current: input.current,
      target: input.target,
      ratio: clampRatio(input.current, input.target),
      unit: input.unit,
    },
  } satisfies AchievementStatus;
}

export function buildAchievementStatuses(
  metrics: AchievementInputMetrics,
): AchievementStatus[] {
  const currentStreak = computeCurrentStreak(metrics);
  const activeDayCount = metrics.activeDayKeys.length;

  return [
    createStatus({
      code: "first_sync",
      current: metrics.firstSyncAt ? 1 : 0,
      target: 1,
      unit: "count",
      unlockedAt: metrics.firstSyncAt,
    }),
    createStatus({
      code: "sessions_1",
      current: metrics.totalSessions,
      target: 1,
      unit: "count",
      unlockedAt: cumulativeThresholdDate(metrics.sessionTimeline, 1),
    }),
    createStatus({
      code: "streak_3",
      current: currentStreak,
      target: 3,
      unit: "days",
      unlockedAt: streakUnlockedAt(metrics.activeDayKeys, currentStreak, 3),
    }),
    createStatus({
      code: "streak_7",
      current: currentStreak,
      target: 7,
      unit: "days",
      unlockedAt: streakUnlockedAt(metrics.activeDayKeys, currentStreak, 7),
    }),
    createStatus({
      code: "streak_14",
      current: currentStreak,
      target: 14,
      unit: "days",
      unlockedAt: streakUnlockedAt(metrics.activeDayKeys, currentStreak, 14),
    }),
    createStatus({
      code: "streak_30",
      current: currentStreak,
      target: 30,
      unit: "days",
      unlockedAt: streakUnlockedAt(metrics.activeDayKeys, currentStreak, 30),
    }),
    createStatus({
      code: "active_days_7",
      current: activeDayCount,
      target: 7,
      unit: "days",
      unlockedAt: nthDateIso(metrics.activeDayKeys, 7),
    }),
    createStatus({
      code: "active_days_30",
      current: activeDayCount,
      target: 30,
      unit: "days",
      unlockedAt: nthDateIso(metrics.activeDayKeys, 30),
    }),
    createStatus({
      code: "active_days_100",
      current: activeDayCount,
      target: 100,
      unit: "days",
      unlockedAt: nthDateIso(metrics.activeDayKeys, 100),
    }),
    createStatus({
      code: "active_days_365",
      current: activeDayCount,
      target: 365,
      unit: "days",
      unlockedAt: nthDateIso(metrics.activeDayKeys, 365),
    }),
    createStatus({
      code: "sessions_200",
      current: metrics.totalSessions,
      target: 200,
      unit: "count",
      unlockedAt: cumulativeThresholdDate(metrics.sessionTimeline, 200),
    }),
    createStatus({
      code: "sessions_1k",
      current: metrics.totalSessions,
      target: 1000,
      unit: "count",
      unlockedAt: cumulativeThresholdDate(metrics.sessionTimeline, 1000),
    }),
    createStatus({
      code: "sessions_5k",
      current: metrics.totalSessions,
      target: 5000,
      unit: "count",
      unlockedAt: cumulativeThresholdDate(metrics.sessionTimeline, 5000),
    }),
    createStatus({
      code: "sessions_20k",
      current: metrics.totalSessions,
      target: 20_000,
      unit: "count",
      unlockedAt: cumulativeThresholdDate(metrics.sessionTimeline, 20_000),
    }),
    createStatus({
      code: "sessions_100k",
      current: metrics.totalSessions,
      target: 100_000,
      unit: "count",
      unlockedAt: cumulativeThresholdDate(metrics.sessionTimeline, 100_000),
    }),
    createStatus({
      code: "spend_usd_100",
      current: metrics.totalEstimatedCostUsd,
      target: 100,
      unit: "usd",
      unlockedAt: cumulativeThresholdDate(metrics.costTimeline, 100),
    }),
    createStatus({
      code: "spend_usd_1k",
      current: metrics.totalEstimatedCostUsd,
      target: 1000,
      unit: "usd",
      unlockedAt: cumulativeThresholdDate(metrics.costTimeline, 1000),
    }),
    createStatus({
      code: "spend_usd_5k",
      current: metrics.totalEstimatedCostUsd,
      target: 5000,
      unit: "usd",
      unlockedAt: cumulativeThresholdDate(metrics.costTimeline, 5000),
    }),
    createStatus({
      code: "spend_usd_20k",
      current: metrics.totalEstimatedCostUsd,
      target: 20_000,
      unit: "usd",
      unlockedAt: cumulativeThresholdDate(metrics.costTimeline, 20_000),
    }),
    createStatus({
      code: "spend_usd_100k",
      current: metrics.totalEstimatedCostUsd,
      target: 100_000,
      unit: "usd",
      unlockedAt: cumulativeThresholdDate(metrics.costTimeline, 100_000),
    }),
    createStatus({
      code: "tokens_100k",
      current: metrics.totalTokens,
      target: 10_000_000,
      unit: "tokens",
      unlockedAt: cumulativeThresholdDate(metrics.tokenTimeline, 10_000_000),
    }),
    createStatus({
      code: "tokens_1m",
      current: metrics.totalTokens,
      target: 100_000_000,
      unit: "tokens",
      unlockedAt: cumulativeThresholdDate(metrics.tokenTimeline, 100_000_000),
    }),
    createStatus({
      code: "tokens_10m",
      current: metrics.totalTokens,
      target: 1_000_000_000,
      unit: "tokens",
      unlockedAt: cumulativeThresholdDate(metrics.tokenTimeline, 1_000_000_000),
    }),
    createStatus({
      code: "tokens_1b",
      current: metrics.totalTokens,
      target: 10_000_000_000,
      unit: "tokens",
      unlockedAt: cumulativeThresholdDate(
        metrics.tokenTimeline,
        10_000_000_000,
      ),
    }),
    createStatus({
      code: "tokens_10b",
      current: metrics.totalTokens,
      target: 100_000_000_000,
      unit: "tokens",
      unlockedAt: cumulativeThresholdDate(
        metrics.tokenTimeline,
        100_000_000_000,
      ),
    }),
    createStatus({
      code: "tokens_100b",
      current: metrics.totalTokens,
      target: 1_000_000_000_000,
      unit: "tokens",
      unlockedAt: cumulativeThresholdDate(
        metrics.tokenTimeline,
        1_000_000_000_000,
      ),
    }),
    createStatus({
      code: "active_hours_10",
      current: metrics.totalActiveSeconds,
      target: 10 * 60 * 60,
      unit: "seconds",
      unlockedAt: cumulativeThresholdDate(
        metrics.activeSecondsTimeline,
        10 * 60 * 60,
      ),
    }),
    createStatus({
      code: "active_hours_100",
      current: metrics.totalActiveSeconds,
      target: 100 * 60 * 60,
      unit: "seconds",
      unlockedAt: cumulativeThresholdDate(
        metrics.activeSecondsTimeline,
        100 * 60 * 60,
      ),
    }),
    createStatus({
      code: "active_hours_200",
      current: metrics.totalActiveSeconds,
      target: 200 * 60 * 60,
      unit: "seconds",
      unlockedAt: cumulativeThresholdDate(
        metrics.activeSecondsTimeline,
        200 * 60 * 60,
      ),
    }),
    createStatus({
      code: "active_hours_500",
      current: metrics.totalActiveSeconds,
      target: 500 * 60 * 60,
      unit: "seconds",
      unlockedAt: cumulativeThresholdDate(
        metrics.activeSecondsTimeline,
        500 * 60 * 60,
      ),
    }),
    createStatus({
      code: "active_hours_2000",
      current: metrics.totalActiveSeconds,
      target: 2000 * 60 * 60,
      unit: "seconds",
      unlockedAt: cumulativeThresholdDate(
        metrics.activeSecondsTimeline,
        2000 * 60 * 60,
      ),
    }),
    createStatus({
      code: "reasoning_25",
      current: metrics.reasoningShare30d,
      target: 0.25,
      unit: "percent",
      unlockedAt:
        metrics.reasoningShare30d >= 0.25
          ? metrics.recentWindowUnlockedAt
          : null,
    }),
    createStatus({
      code: "reasoning_40",
      current: metrics.reasoningShare30d,
      target: 0.4,
      unit: "percent",
      unlockedAt:
        metrics.reasoningShare30d >= 0.4
          ? metrics.recentWindowUnlockedAt
          : null,
    }),
    createStatus({
      code: "cache_15",
      current: metrics.cacheShare30d,
      target: 0.9,
      unit: "percent",
      unlockedAt:
        metrics.cacheShare30d >= 0.9 ? metrics.recentWindowUnlockedAt : null,
    }),
    createStatus({
      code: "cache_30",
      current: metrics.cacheShare30d,
      target: 0.95,
      unit: "percent",
      unlockedAt:
        metrics.cacheShare30d >= 0.95 ? metrics.recentWindowUnlockedAt : null,
    }),
    createStatus({
      code: "project_focus_70",
      current: metrics.topProjectShare30d,
      target: 0.7,
      unit: "percent",
      unlockedAt:
        metrics.topProjectShare30d >= 0.7
          ? metrics.recentWindowUnlockedAt
          : null,
    }),
    createStatus({
      code: "project_focus_90",
      current: metrics.topProjectShare30d,
      target: 0.9,
      unit: "percent",
      unlockedAt:
        metrics.topProjectShare30d >= 0.9
          ? metrics.recentWindowUnlockedAt
          : null,
    }),
    createStatus({
      code: "models_3",
      current: new Set(metrics.modelTimeline.map((point) => point.key)).size,
      target: 3,
      unit: "count",
      unlockedAt: distinctThresholdDate(metrics.modelTimeline, 3),
    }),
    createStatus({
      code: "models_5",
      current: new Set(metrics.modelTimeline.map((point) => point.key)).size,
      target: 5,
      unit: "count",
      unlockedAt: distinctThresholdDate(metrics.modelTimeline, 5),
    }),
    createStatus({
      code: "tools_2",
      current: new Set(metrics.toolTimeline.map((point) => point.key)).size,
      target: 2,
      unit: "count",
      unlockedAt: distinctThresholdDate(metrics.toolTimeline, 2),
    }),
    createStatus({
      code: "tools_4",
      current: new Set(metrics.toolTimeline.map((point) => point.key)).size,
      target: 4,
      unit: "count",
      unlockedAt: distinctThresholdDate(metrics.toolTimeline, 4),
    }),
    createStatus({
      code: "projects_5",
      current: new Set(metrics.projectTimeline.map((point) => point.key)).size,
      target: 5,
      unit: "count",
      unlockedAt: distinctThresholdDate(metrics.projectTimeline, 5),
    }),
    createStatus({
      code: "projects_15",
      current: new Set(metrics.projectTimeline.map((point) => point.key)).size,
      target: 15,
      unit: "count",
      unlockedAt: distinctThresholdDate(metrics.projectTimeline, 15),
    }),
    createStatus({
      code: "devices_2",
      current: new Set(metrics.deviceTimeline.map((point) => point.key)).size,
      target: 2,
      unit: "count",
      unlockedAt: distinctThresholdDate(metrics.deviceTimeline, 2),
    }),
    createStatus({
      code: "devices_3",
      current: new Set(metrics.deviceTimeline.map((point) => point.key)).size,
      target: 3,
      unit: "count",
      unlockedAt: distinctThresholdDate(metrics.deviceTimeline, 3),
    }),
    createStatus({
      code: "first_follow",
      current: metrics.followingCount,
      target: 1,
      unit: "count",
      unlockedAt: metrics.firstFollowingAt,
    }),
    createStatus({
      code: "following_10",
      current: metrics.followingCount,
      target: 10,
      unit: "count",
      unlockedAt: nthTimelineIso(metrics.followingTimeline, 10),
    }),
    createStatus({
      code: "first_follower",
      current: metrics.followerCount,
      target: 1,
      unit: "count",
      unlockedAt: metrics.firstFollowerAt,
    }),
    createStatus({
      code: "followers_10",
      current: metrics.followerCount,
      target: 10,
      unit: "count",
      unlockedAt: nthTimelineIso(metrics.followerTimeline, 10),
    }),
    createStatus({
      code: "mutual_3",
      current: metrics.mutualCount,
      target: 3,
      unit: "count",
      unlockedAt: metrics.mutualReachedAt,
    }),
    createStatus({
      code: "mutual_10",
      current: metrics.mutualCount,
      target: 10,
      unit: "count",
      unlockedAt: nthTimelineIso(metrics.mutualTimeline, 10),
    }),
    createStatus({
      code: "leaderboard_day_top50",
      ...rankTierProgress(metrics.leaderboardDayRank, 50),
      unit: "count",
      unlockedAt:
        metrics.leaderboardDayRank !== null && metrics.leaderboardDayRank <= 50
          ? metrics.recentWindowUnlockedAt
          : null,
    }),
    createStatus({
      code: "leaderboard_week_top50",
      ...rankTierProgress(metrics.leaderboardWeekRank, 50),
      unit: "count",
      unlockedAt:
        metrics.leaderboardWeekRank !== null &&
        metrics.leaderboardWeekRank <= 50
          ? metrics.recentWindowUnlockedAt
          : null,
    }),
    createStatus({
      code: "leaderboard_month_top50",
      ...rankTierProgress(metrics.leaderboardMonthRank, 50),
      unit: "count",
      unlockedAt:
        metrics.leaderboardMonthRank !== null &&
        metrics.leaderboardMonthRank <= 50
          ? metrics.recentWindowUnlockedAt
          : null,
    }),
    createStatus({
      code: "leaderboard_all_time_top100",
      ...rankTierProgress(metrics.leaderboardAllTimeRank, 100),
      unit: "count",
      unlockedAt:
        metrics.leaderboardAllTimeRank !== null &&
        metrics.leaderboardAllTimeRank <= 100
          ? metrics.recentWindowUnlockedAt
          : null,
    }),
    createStatus({
      code: "leaderboard_all_time_top10",
      ...rankTierProgress(metrics.leaderboardAllTimeRank, 10),
      unit: "count",
      unlockedAt:
        metrics.leaderboardAllTimeRank !== null &&
        metrics.leaderboardAllTimeRank <= 10
          ? metrics.recentWindowUnlockedAt
          : null,
    }),
    createStatus({
      code: "leaderboard_all_time_first",
      ...rankTierProgress(metrics.leaderboardAllTimeRank, 1),
      unit: "count",
      unlockedAt:
        metrics.leaderboardAllTimeRank === 1
          ? metrics.recentWindowUnlockedAt
          : null,
    }),
  ].sort((left, right) => left.order - right.order);
}

function tierWeight(tier: AchievementStatus["tier"]) {
  switch (tier) {
    case "special":
      return 4;
    case "gold":
      return 3;
    case "silver":
      return 2;
    default:
      return 1;
  }
}

function compareUnlocked(left: AchievementStatus, right: AchievementStatus) {
  const leftAt = left.unlockedAt ? Date.parse(left.unlockedAt) : 0;
  const rightAt = right.unlockedAt ? Date.parse(right.unlockedAt) : 0;

  return rightAt - leftAt || tierWeight(right.tier) - tierWeight(left.tier);
}

function compareTargets(left: AchievementStatus, right: AchievementStatus) {
  return (
    right.progress.ratio - left.progress.ratio ||
    tierWeight(right.tier) - tierWeight(left.tier) ||
    left.order - right.order
  );
}

export function buildAchievementsPageData(
  metrics: AchievementInputMetrics,
): AchievementsPageData {
  const achievements = buildAchievementStatuses(metrics);
  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  const locked = achievements.filter((achievement) => !achievement.unlocked);
  const score = unlocked.reduce(
    (sum, achievement) => sum + achievement.points,
    0,
  );
  const level = 1 + Math.floor(score / 100);
  const sections: AchievementCategorySection[] = achievementCategories.map(
    (category) => {
      const rows = achievements.filter(
        (achievement) => achievement.category === category,
      );

      return {
        category,
        unlockedCount: rows.filter((achievement) => achievement.unlocked)
          .length,
        totalCount: rows.length,
        achievements: rows,
      };
    },
  );

  return {
    timezone: metrics.timezone,
    summary: {
      score,
      level,
      unlockedCount: unlocked.length,
      totalCount: achievements.length,
      currentStreak: computeCurrentStreak(metrics),
      totalActiveDays: metrics.activeDayKeys.length,
      currentPersona: metrics.currentPersona,
    },
    featured: [...unlocked].sort(compareUnlocked).slice(0, 3),
    recentUnlocks: [...unlocked].sort(compareUnlocked).slice(0, 5),
    nextTargets: [...locked].sort(compareTargets).slice(0, 3),
    sections,
  };
}

export function buildAchievementNotificationData(
  pageData: AchievementsPageData,
): AchievementNotificationData {
  return {
    timezone: pageData.timezone,
    score: pageData.summary.score,
    level: pageData.summary.level,
    unlockedCount: pageData.summary.unlockedCount,
    totalCount: pageData.summary.totalCount,
    currentStreak: pageData.summary.currentStreak,
    recentUnlocks: pageData.recentUnlocks.slice(0, 3),
    nextTargets: pageData.nextTargets.slice(0, 3),
    currentPersona: pageData.summary.currentPersona,
  };
}
