import { describe, expect, it } from "vitest";
import {
  buildAchievementAwardPlan,
  mergeAchievementRecords,
  type StoredAchievementRecord,
} from "./records";
import type { AchievementStatus } from "./types";

function createStatus(
  overrides: Partial<AchievementStatus> & Pick<AchievementStatus, "code">,
): AchievementStatus {
  const { code, ...rest } = overrides;
  return {
    category: "volume",
    tier: "bronze",
    iconKey: "coins",
    points: 10,
    titleKey: `achievements.items.${code}.title`,
    descriptionKey: `achievements.items.${code}.description`,
    order: 1,
    unlocked: true,
    isQualifiedNow: true,
    unlockedAt: "2026-04-01T00:00:00.000Z",
    firstAwardedAt: null,
    lastAwardedAt: null,
    awardCount: 0,
    progress: {
      current: 0,
      target: 1,
      ratio: 0,
      unit: "count",
    },
    code,
    ...rest,
  };
}

function createRecord(
  overrides: Partial<StoredAchievementRecord> &
    Pick<StoredAchievementRecord, "code">,
): StoredAchievementRecord {
  const { code, ...rest } = overrides;
  return {
    awardCount: 0,
    firstAwardedAt: null,
    lastAwardedAt: null,
    state: null,
    code,
    ...rest,
  };
}

describe("buildAchievementAwardPlan", () => {
  it("issues one award per newly crossed cumulative threshold step", () => {
    const plan = buildAchievementAwardPlan({
      userId: "user_1",
      evaluatedAt: "2026-04-01T00:00:00.000Z",
      source: "ingest",
      statuses: [
        createStatus({
          code: "sessions_200",
          progress: {
            current: 450,
            target: 200,
            ratio: 1,
            unit: "count",
          },
        }),
      ],
      records: [createRecord({ code: "sessions_200", awardCount: 1 })],
    });

    expect(plan.awards.map((award) => award.dedupeKey)).toEqual([
      "user_1:sessions_200:step:2",
    ]);
    expect(plan.records.get("sessions_200")).toMatchObject({
      awardCount: 2,
      lastAwardedAt: "2026-04-01T00:00:00.000Z",
    });
  });

  it("re-awards recross badges only when the user qualifies again after dropping below the threshold", () => {
    const dropped = buildAchievementAwardPlan({
      userId: "user_1",
      evaluatedAt: "2026-04-01T00:00:00.000Z",
      source: "ingest",
      statuses: [
        createStatus({
          code: "streak_7",
          unlocked: false,
          isQualifiedNow: false,
          unlockedAt: null,
          progress: {
            current: 2,
            target: 7,
            ratio: 2 / 7,
            unit: "days",
          },
        }),
      ],
      records: [
        createRecord({
          code: "streak_7",
          awardCount: 1,
          state: { lastQualified: true },
        }),
      ],
    });

    expect(dropped.awards).toHaveLength(0);
    expect(dropped.records.get("streak_7")?.state).toEqual({
      lastQualified: false,
    });

    const requalified = buildAchievementAwardPlan({
      userId: "user_1",
      evaluatedAt: "2026-04-02T00:00:00.000Z",
      source: "ingest",
      statuses: [
        createStatus({
          code: "streak_7",
          progress: {
            current: 7,
            target: 7,
            ratio: 1,
            unit: "days",
          },
          unlockedAt: "2026-04-02T00:00:00.000Z",
        }),
      ],
      records: [
        dropped.records.get("streak_7") ?? createRecord({ code: "streak_7" }),
      ],
    });

    expect(requalified.awards.map((award) => award.dedupeKey)).toEqual([
      "user_1:streak_7:award:2",
    ]);
    expect(requalified.records.get("streak_7")).toMatchObject({
      awardCount: 2,
      state: { lastQualified: true },
    });
  });

  it("keeps recurring leaderboard period badges out of generic achievement sync", () => {
    const plan = buildAchievementAwardPlan({
      userId: "user_1",
      evaluatedAt: "2026-04-01T00:00:00.000Z",
      source: "manual",
      statuses: [
        createStatus({
          code: "leaderboard_week_top50",
          progress: {
            current: 39,
            target: 1,
            ratio: 1,
            unit: "count",
          },
        }),
      ],
      records: [],
    });

    expect(plan.awards).toHaveLength(0);
    expect(plan.records.get("leaderboard_week_top50")).toBeUndefined();
  });
});

describe("mergeAchievementRecords", () => {
  it("marks badges as unlocked from stored awards and exposes the count for UI badges", () => {
    const statuses = mergeAchievementRecords(
      [
        createStatus({
          code: "leaderboard_month_top50",
          unlocked: false,
          isQualifiedNow: false,
          unlockedAt: null,
          progress: {
            current: 0,
            target: 1,
            ratio: 0,
            unit: "count",
          },
        }),
      ],
      new Map([
        [
          "leaderboard_month_top50",
          createRecord({
            code: "leaderboard_month_top50",
            awardCount: 3,
            firstAwardedAt: "2026-02-01T20:00:00.000Z",
            lastAwardedAt: "2026-04-01T20:00:00.000Z",
          }),
        ],
      ]),
    );

    expect(statuses[0]).toMatchObject({
      unlocked: true,
      isQualifiedNow: false,
      awardCount: 3,
      unlockedAt: "2026-04-01T20:00:00.000Z",
      firstAwardedAt: "2026-02-01T20:00:00.000Z",
      lastAwardedAt: "2026-04-01T20:00:00.000Z",
    });
  });
});
