import { describe, expect, it } from "vitest";
import {
  achievementDefinitionMap,
  achievementDefinitions,
  getAchievementCountBadgeValue,
} from "./catalog";

describe("achievementDefinitions", () => {
  it("is a non-empty array with correct structure", () => {
    expect(Array.isArray(achievementDefinitions)).toBe(true);
    expect(achievementDefinitions.length).toBeGreaterThan(0);

    for (const def of achievementDefinitions) {
      expect(def).toHaveProperty("code");
      expect(def).toHaveProperty("category");
      expect(def).toHaveProperty("tier");
      expect(def).toHaveProperty("iconKey");
      expect(def).toHaveProperty("points");
      expect(def).toHaveProperty("titleKey");
      expect(def).toHaveProperty("descriptionKey");
      expect(def).toHaveProperty("order");
      expect(typeof def.points).toBe("number");
      expect(typeof def.order).toBe("number");
    }
  });
});

describe("achievementDefinitionMap", () => {
  it("has entries for all definitions", () => {
    expect(achievementDefinitionMap.size).toBe(achievementDefinitions.length);

    for (const def of achievementDefinitions) {
      expect(achievementDefinitionMap.has(def.code)).toBe(true);
      expect(achievementDefinitionMap.get(def.code)).toBe(def);
    }
  });
});

describe("getAchievementCountBadgeValue", () => {
  it("returns 0 for a non-repeatable achievement", () => {
    // "first_sync" is not in repeatableAchievementCodes
    expect(getAchievementCountBadgeValue("first_sync", 5)).toBe(0);
    expect(getAchievementCountBadgeValue("sessions_1", 3)).toBe(0);
  });

  it("returns 0 for a repeatable achievement with awardCount=1", () => {
    // "streak_3" is repeatable but awardCount is 1
    expect(getAchievementCountBadgeValue("streak_3", 1)).toBe(0);
    expect(getAchievementCountBadgeValue("leaderboard_day_top50", 1)).toBe(0);
  });

  it("returns awardCount for a repeatable achievement with awardCount>1", () => {
    expect(getAchievementCountBadgeValue("streak_3", 5)).toBe(5);
    expect(
      getAchievementCountBadgeValue("leaderboard_all_time_first", 10),
    ).toBe(10);
    expect(getAchievementCountBadgeValue("streak_7", 3)).toBe(3);
  });
});

describe("tier points mapping", () => {
  it("assigns correct points per tier", () => {
    const bronze = achievementDefinitions.find((d) => d.code === "first_sync");
    const silver = achievementDefinitions.find((d) => d.code === "streak_7");
    const gold = achievementDefinitions.find((d) => d.code === "streak_14");
    const special = achievementDefinitions.find(
      (d) => d.code === "active_days_365",
    );

    expect(bronze?.points).toBe(10);
    expect(silver?.points).toBe(20);
    expect(gold?.points).toBe(40);
    expect(special?.points).toBe(60);
  });
});
