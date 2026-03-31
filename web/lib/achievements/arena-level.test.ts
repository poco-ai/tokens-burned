import { describe, expect, it } from "vitest";
import { getArenaLevelProgressFromScore } from "./arena-level";

describe("getArenaLevelProgressFromScore", () => {
  it("Lv.1 at score 0", () => {
    const r = getArenaLevelProgressFromScore(0);
    expect(r.level).toBe(1);
    expect(r.nextLevel).toBe(2);
    expect(r.ratio).toBe(0);
    expect(r.remainingToNext).toBe(100);
  });

  it("progress mid-band", () => {
    const r = getArenaLevelProgressFromScore(340);
    expect(r.level).toBe(4);
    expect(r.ratio).toBeCloseTo(0.4);
    expect(r.remainingToNext).toBe(60);
  });

  it("exactly at level boundary", () => {
    const r = getArenaLevelProgressFromScore(400);
    expect(r.level).toBe(5);
    expect(r.ratio).toBe(0);
    expect(r.remainingToNext).toBe(100);
  });
});
