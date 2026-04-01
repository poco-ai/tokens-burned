import { achievementDefinitionMap } from "@/lib/achievements/catalog";
import type {
  AchievementCode,
  AchievementIconKey,
  AchievementTier,
} from "@/lib/achievements/types";
import { prisma } from "@/lib/prisma";

const TIER_RANK: Record<AchievementTier, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  special: 3,
};

export type ProfileAchievementWallItem = {
  code: AchievementCode;
  iconKey: AchievementIconKey;
  tier: AchievementTier;
  awardCount: number;
};

type SortableWallRow = ProfileAchievementWallItem & {
  tierRank: number;
  lastAwardedMs: number;
};

/**
 * Up to `limit` unlocked achievements for profile sidebar:
 * sort by highest tier, then highest award count, then most recently awarded.
 */
export async function getProfileAchievementWall(
  userId: string,
  limit = 5,
): Promise<ProfileAchievementWallItem[]> {
  const rows = await prisma.userAchievement.findMany({
    where: {
      userId,
      awardCount: { gt: 0 },
    },
  });

  const items: SortableWallRow[] = [];

  for (const row of rows) {
    const def = achievementDefinitionMap.get(row.code as AchievementCode);
    if (!def) {
      continue;
    }

    items.push({
      code: def.code,
      iconKey: def.iconKey,
      tier: def.tier,
      awardCount: row.awardCount,
      tierRank: TIER_RANK[def.tier] ?? 0,
      lastAwardedMs: row.lastAwardedAt?.getTime() ?? 0,
    });
  }

  items.sort((a, b) => {
    if (b.tierRank !== a.tierRank) {
      return b.tierRank - a.tierRank;
    }
    if (b.awardCount !== a.awardCount) {
      return b.awardCount - a.awardCount;
    }
    return b.lastAwardedMs - a.lastAwardedMs;
  });

  return items.slice(0, limit).map((row) => ({
    code: row.code,
    iconKey: row.iconKey,
    tier: row.tier,
    awardCount: row.awardCount,
  }));
}
