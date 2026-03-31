import type { UsageShareCardPersona } from "@/lib/usage/share-card";

export const achievementCategories = [
  "activation",
  "consistency",
  "volume",
  "craft",
  "exploration",
  "social",
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
  "globe",
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
  | "public_profile"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "active_days_7"
  | "active_days_30"
  | "active_days_100"
  | "tokens_100k"
  | "tokens_1m"
  | "tokens_10m"
  | "sessions_10"
  | "sessions_100"
  | "sessions_1000"
  | "active_hours_10"
  | "active_hours_50"
  | "active_hours_200"
  | "reasoning_25"
  | "cache_15"
  | "project_focus_70"
  | "models_3"
  | "tools_2"
  | "projects_5"
  | "devices_2"
  | "first_follow"
  | "first_follower"
  | "mutual_3";

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
  | "percent";

export type AchievementStatus = AchievementDefinition & {
  unlocked: boolean;
  unlockedAt: string | null;
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
