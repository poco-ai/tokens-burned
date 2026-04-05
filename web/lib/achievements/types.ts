import type { UsageShareCardPersona } from "@/lib/usage/share-card";

export const achievementCategories = [
  "activation",
  "leaderboard",
  "social",
  "consistency",
  "volume",
  "spend",
  "craft",
  "exploration",
] as const;
export type AchievementCategory = (typeof achievementCategories)[number];

export const achievementTiers = [
  "bronze",
  "silver",
  "gold",
  "special",
] as const;
export type AchievementTier = (typeof achievementTiers)[number];

export const achievementIconKeys = [
  "rocket",
  "flame",
  "calendar-check",
  "coins",
  "messages-square",
  "clock",
  "brain",
  "database-zap",
  "focus",
  "orbit",
  "wrench",
  "folder-git",
  "monitor-smartphone",
  "user-plus",
  "heart-handshake",
  "users",
  "sparkles",
  "trophy",
  "target",
] as const;
export type AchievementIconKey = (typeof achievementIconKeys)[number];

export type AchievementCode =
  | "first_sync"
  | "sessions_1"
  | "streak_3"
  | "streak_7"
  | "streak_14"
  | "streak_30"
  | "active_days_7"
  | "active_days_30"
  | "active_days_100"
  | "active_days_365"
  | "tokens_100k"
  | "tokens_1m"
  | "tokens_10m"
  | "tokens_1b"
  | "tokens_10b"
  | "tokens_100b"
  | "sessions_200"
  | "sessions_1k"
  | "sessions_5k"
  | "sessions_20k"
  | "sessions_100k"
  | "spend_usd_100"
  | "spend_usd_1k"
  | "spend_usd_5k"
  | "spend_usd_20k"
  | "spend_usd_100k"
  | "active_hours_10"
  | "active_hours_100"
  | "active_hours_200"
  | "active_hours_500"
  | "active_hours_2000"
  | "reasoning_25"
  | "reasoning_40"
  | "cache_15"
  | "cache_30"
  | "project_focus_70"
  | "project_focus_90"
  | "models_3"
  | "models_5"
  | "models_20"
  | "tools_2"
  | "tools_4"
  | "projects_5"
  | "projects_15"
  | "devices_2"
  | "devices_3"
  | "first_follow"
  | "following_10"
  | "first_follower"
  | "followers_10"
  | "mutual_3"
  | "mutual_10"
  | "leaderboard_day_top50"
  | "leaderboard_week_top50"
  | "leaderboard_month_top50"
  | "leaderboard_all_time_top100"
  | "leaderboard_all_time_top10"
  | "leaderboard_all_time_first";

export type AchievementDefinition = {
  code: AchievementCode;
  category: AchievementCategory;
  tier: AchievementTier;
  iconKey: AchievementIconKey;
  points: number;
  titleKey: string;
  descriptionKey: string;
  order: number;
};

export type AchievementProgressUnit =
  | "count"
  | "days"
  | "tokens"
  | "seconds"
  | "percent"
  | "usd";

export type AchievementStatus = AchievementDefinition & {
  unlocked: boolean;
  isQualifiedNow: boolean;
  unlockedAt: string | null;
  firstAwardedAt: string | null;
  lastAwardedAt: string | null;
  awardCount: number;
  progress: {
    current: number;
    target: number;
    ratio: number;
    unit: AchievementProgressUnit;
  };
};

export type AchievementCategorySection = {
  category: AchievementCategory;
  unlockedCount: number;
  totalCount: number;
  achievements: AchievementStatus[];
};

export type AchievementsPageData = {
  timezone: string;
  summary: {
    score: number;
    level: number;
    unlockedCount: number;
    totalCount: number;
    currentStreak: number;
    totalActiveDays: number;
    currentPersona: UsageShareCardPersona | null;
  };
  featured: AchievementStatus[];
  recentUnlocks: AchievementStatus[];
  nextTargets: AchievementStatus[];
  sections: AchievementCategorySection[];
};

export type AchievementNotificationData = {
  timezone: string;
  score: number;
  level: number;
  unlockedCount: number;
  totalCount: number;
  currentStreak: number;
  recentUnlocks: AchievementStatus[];
  nextTargets: AchievementStatus[];
  currentPersona: UsageShareCardPersona | null;
};
