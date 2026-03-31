import type {
  AchievementCode,
  AchievementDefinition,
  AchievementTier,
} from "./types";

const tierPoints: Record<AchievementTier, number> = {
  bronze: 10,
  silver: 20,
  gold: 40,
  special: 60,
};

function define(
  input: Omit<AchievementDefinition, "points" | "titleKey" | "descriptionKey">,
): AchievementDefinition {
  return {
    ...input,
    points: tierPoints[input.tier],
    titleKey: `achievements.items.${input.code}.title`,
    descriptionKey: `achievements.items.${input.code}.description`,
  };
}

export const achievementDefinitions: AchievementDefinition[] = [
  define({
    code: "first_sync",
    category: "activation",
    tier: "bronze",
    iconKey: "rocket",
    order: 10,
  }),
  define({
    code: "public_profile",
    category: "activation",
    tier: "silver",
    iconKey: "globe",
    order: 20,
  }),
  define({
    code: "streak_3",
    category: "consistency",
    tier: "bronze",
    iconKey: "flame",
    order: 30,
  }),
  define({
    code: "streak_7",
    category: "consistency",
    tier: "silver",
    iconKey: "flame",
    order: 40,
  }),
  define({
    code: "streak_30",
    category: "consistency",
    tier: "gold",
    iconKey: "flame",
    order: 50,
  }),
  define({
    code: "active_days_7",
    category: "consistency",
    tier: "bronze",
    iconKey: "calendar-check",
    order: 60,
  }),
  define({
    code: "active_days_30",
    category: "consistency",
    tier: "silver",
    iconKey: "calendar-check",
    order: 70,
  }),
  define({
    code: "active_days_100",
    category: "consistency",
    tier: "gold",
    iconKey: "calendar-check",
    order: 80,
  }),
  define({
    code: "tokens_100k",
    category: "volume",
    tier: "bronze",
    iconKey: "coins",
    order: 90,
  }),
  define({
    code: "tokens_1m",
    category: "volume",
    tier: "silver",
    iconKey: "coins",
    order: 100,
  }),
  define({
    code: "tokens_10m",
    category: "volume",
    tier: "gold",
    iconKey: "coins",
    order: 110,
  }),
  define({
    code: "sessions_10",
    category: "volume",
    tier: "bronze",
    iconKey: "messages-square",
    order: 120,
  }),
  define({
    code: "sessions_100",
    category: "volume",
    tier: "silver",
    iconKey: "messages-square",
    order: 130,
  }),
  define({
    code: "sessions_1000",
    category: "volume",
    tier: "gold",
    iconKey: "messages-square",
    order: 140,
  }),
  define({
    code: "active_hours_10",
    category: "volume",
    tier: "bronze",
    iconKey: "clock",
    order: 150,
  }),
  define({
    code: "active_hours_50",
    category: "volume",
    tier: "silver",
    iconKey: "clock",
    order: 160,
  }),
  define({
    code: "active_hours_200",
    category: "volume",
    tier: "gold",
    iconKey: "clock",
    order: 170,
  }),
  define({
    code: "reasoning_25",
    category: "craft",
    tier: "special",
    iconKey: "brain",
    order: 180,
  }),
  define({
    code: "cache_15",
    category: "craft",
    tier: "special",
    iconKey: "database-zap",
    order: 190,
  }),
  define({
    code: "project_focus_70",
    category: "craft",
    tier: "special",
    iconKey: "focus",
    order: 200,
  }),
  define({
    code: "models_3",
    category: "exploration",
    tier: "bronze",
    iconKey: "orbit",
    order: 210,
  }),
  define({
    code: "tools_2",
    category: "exploration",
    tier: "bronze",
    iconKey: "wrench",
    order: 220,
  }),
  define({
    code: "projects_5",
    category: "exploration",
    tier: "silver",
    iconKey: "folder-git",
    order: 230,
  }),
  define({
    code: "devices_2",
    category: "exploration",
    tier: "silver",
    iconKey: "monitor-smartphone",
    order: 240,
  }),
  define({
    code: "first_follow",
    category: "social",
    tier: "bronze",
    iconKey: "user-plus",
    order: 250,
  }),
  define({
    code: "first_follower",
    category: "social",
    tier: "silver",
    iconKey: "heart-handshake",
    order: 260,
  }),
  define({
    code: "mutual_3",
    category: "social",
    tier: "gold",
    iconKey: "users",
    order: 270,
  }),
];

export const achievementDefinitionMap = new Map<
  AchievementCode,
  AchievementDefinition
>(achievementDefinitions.map((definition) => [definition.code, definition]));
