import { describe, expect, it } from "vitest";
import {
  ARENA_LEVEL_THRESHOLDS,
  getArenaLevelFromScore,
  getArenaLevelProgressFromScore,
  getArenaScoreThresholdForLevel,
  MAX_ARENA_LEVEL,
} from "./arena-level";

describe("arena level thresholds", () => {
  it("uses the calibrated 10-level curve", () => {
    expect(ARENA_LEVEL_THRESHOLDS).toEqual([
      0, 100, 300, 700, 1500, 3000, 8000, 15000, 25000, 40000,
    ]);
    expect(MAX_ARENA_LEVEL).toBe(10);
    expect(getArenaScoreThresholdForLevel(1)).toBe(0);
    expect(getArenaScoreThresholdForLevel(6)).toBe(3000);
    expect(getArenaScoreThresholdForLevel(7)).toBe(8000);
    expect(getArenaScoreThresholdForLevel(10)).toBe(40000);
    expect(getArenaScoreThresholdForLevel(99)).toBe(40000);
  });
});

describe("getArenaLevelFromScore", () => {
  it("maps score into the fixed 10-level ladder", () => {
    expect(getArenaLevelFromScore(0)).toBe(1);
    expect(getArenaLevelFromScore(99)).toBe(1);
    expect(getArenaLevelFromScore(100)).toBe(2);
    expect(getArenaLevelFromScore(299)).toBe(2);
    expect(getArenaLevelFromScore(300)).toBe(3);
    expect(getArenaLevelFromScore(2999)).toBe(5);
    expect(getArenaLevelFromScore(3000)).toBe(6);
    expect(getArenaLevelFromScore(6100)).toBe(6);
    expect(getArenaLevelFromScore(8000)).toBe(7);
    expect(getArenaLevelFromScore(40000)).toBe(10);
    expect(getArenaLevelFromScore(60000)).toBe(10);
  });
});

describe("getArenaLevelProgressFromScore", () => {
  it("starts at Lv.1 with progress to Lv.2", () => {
    const result = getArenaLevelProgressFromScore(0);

    expect(result.level).toBe(1);
    expect(result.nextLevel).toBe(2);
    expect(result.ratio).toBe(0);
    expect(result.remainingToNext).toBe(100);
    expect(result.isMaxLevel).toBe(false);
  });

  it("keeps 6.1K users around Lv.6", () => {
    const result = getArenaLevelProgressFromScore(6100);

    expect(result.level).toBe(6);
    expect(result.bandStart).toBe(3000);
    expect(result.nextThreshold).toBe(8000);
    expect(result.ratio).toBeCloseTo(3100 / 5000);
    expect(result.remainingToNext).toBe(1900);
    expect(result.isMaxLevel).toBe(false);
  });

  it("caps progress at Lv.10", () => {
    const result = getArenaLevelProgressFromScore(40000);

    expect(result.level).toBe(10);
    expect(result.nextLevel).toBe(10);
    expect(result.ratio).toBe(1);
    expect(result.remainingToNext).toBe(0);
    expect(result.isMaxLevel).toBe(true);
  });
});
