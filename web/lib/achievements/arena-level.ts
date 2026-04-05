export const ARENA_LEVEL_THRESHOLDS = [
  0, 100, 300, 700, 1500, 3000, 8000, 15000, 25000, 40000,
] as const;

export const MAX_ARENA_LEVEL = ARENA_LEVEL_THRESHOLDS.length;

/**
 * Fixed 10-level ladder calibrated so that users around 6.1K score are already
 * in the top levels, but still need a meaningful push to reach max level.
 *
 * Thresholds:
 * - Lv.1: 0
 * - Lv.2: 100
 * - Lv.3: 300
 * - Lv.4: 700
 * - Lv.5: 1,500
 * - Lv.6: 3,000
 * - Lv.7: 8,000
 * - Lv.8: 15,000
 * - Lv.9: 25,000
 * - Lv.10: 40,000
 */
export function getArenaScoreThresholdForLevel(level: number) {
  const safeLevel = Math.min(MAX_ARENA_LEVEL, Math.max(1, Math.floor(level)));

  return ARENA_LEVEL_THRESHOLDS[safeLevel - 1];
}

export function getArenaLevelFromScore(score: number) {
  const safeScore = Math.max(0, score);

  for (let index = ARENA_LEVEL_THRESHOLDS.length - 1; index >= 0; index -= 1) {
    if (safeScore >= ARENA_LEVEL_THRESHOLDS[index]) {
      return index + 1;
    }
  }

  return 1;
}

export function getArenaLevelProgressFromScore(score: number) {
  const safeScore = Math.max(0, score);
  const level = getArenaLevelFromScore(safeScore);
  const isMaxLevel = level >= MAX_ARENA_LEVEL;
  const bandStart = getArenaScoreThresholdForLevel(level);
  const nextLevel = isMaxLevel ? MAX_ARENA_LEVEL : level + 1;
  const nextThreshold = isMaxLevel
    ? getArenaScoreThresholdForLevel(MAX_ARENA_LEVEL)
    : getArenaScoreThresholdForLevel(level + 1);
  const span = nextThreshold - bandStart;
  const ratio = isMaxLevel
    ? 1
    : span <= 0
      ? 1
      : Math.min(1, Math.max(0, (safeScore - bandStart) / span));
  const remainingToNext = isMaxLevel
    ? 0
    : Math.max(0, nextThreshold - safeScore);

  return {
    level,
    nextLevel,
    ratio,
    remainingToNext,
    bandStart,
    nextThreshold,
    isMaxLevel,
  };
}
