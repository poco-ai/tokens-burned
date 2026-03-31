/**
 * Arena level tiers: every 100 score points advances one level (Lv.1 from score 0).
 * Matches `buildAchievementsPageData` in `evaluate.ts`.
 */
export function getArenaLevelProgressFromScore(score: number) {
  const safe = Math.max(0, score);
  const level = 1 + Math.floor(safe / 100);
  const bandStart = (level - 1) * 100;
  const nextThreshold = level * 100;
  const span = nextThreshold - bandStart;
  const ratio =
    span <= 0 ? 1 : Math.min(1, Math.max(0, (safe - bandStart) / span));
  const remainingToNext = Math.max(0, nextThreshold - safe);

  return {
    level,
    nextLevel: level + 1,
    ratio,
    remainingToNext,
    bandStart,
    nextThreshold,
  };
}
