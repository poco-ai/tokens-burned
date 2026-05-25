import type {
  AchievementAwardSource,
  Prisma,
} from "../../generated/prisma/client";
import type { AchievementCode, AchievementStatus } from "./types";

type RepeatRule =
  | { mode: "once" }
  | { mode: "threshold_step" }
  | { mode: "recross" }
  | { mode: "external" };

type StoredAchievementState = {
  lastQualified?: boolean;
};

export type StoredAchievementRecord = {
  code: AchievementCode;
  awardCount: number;
  firstAwardedAt: string | null;
  lastAwardedAt: string | null;
  state: StoredAchievementState | null;
};

export type PlannedAchievementAward = {
  userId: string;
  code: AchievementCode;
  awardedAt: string;
  source: AchievementAwardSource;
  dedupeKey: string;
  pointsAwarded: number;
  progressValue: number;
  thresholdValue: number;
  context: Prisma.InputJsonValue;
};

function getRepeatRule(code: AchievementCode): RepeatRule {
  switch (code) {
    case "streak_3":
    case "streak_7":
    case "streak_14":
    case "streak_30":
    case "reasoning_25":
    case "reasoning_40":
    case "cache_15":
    case "cache_30":
    case "project_focus_70":
    case "project_focus_90":
    case "following_10":
    case "followers_10":
    case "mutual_3":
    case "mutual_10":
    case "leaderboard_all_time_top100":
    case "leaderboard_all_time_top10":
    case "leaderboard_all_time_first":
      return { mode: "recross" };
    case "leaderboard_day_top50":
    case "leaderboard_week_top50":
    case "leaderboard_month_top50":
      return { mode: "external" };
    case "active_days_7":
    case "active_days_30":
    case "active_days_100":
    case "active_days_365":
    case "tokens_100k":
    case "tokens_1m":
    case "tokens_10m":
    case "tokens_1b":
    case "tokens_10b":
    case "tokens_100b":
    case "sessions_200":
    case "sessions_1k":
    case "sessions_5k":
    case "sessions_20k":
    case "sessions_100k":
    case "spend_usd_100":
    case "spend_usd_1k":
    case "spend_usd_5k":
    case "spend_usd_20k":
    case "spend_usd_100k":
    case "active_hours_10":
    case "active_hours_100":
    case "active_hours_200":
    case "active_hours_500":
    case "active_hours_2000":
      return { mode: "threshold_step" };
    default:
      return { mode: "once" };
  }
}

function createAward(input: {
  userId: string;
  code: AchievementCode;
  awardedAt: string;
  source: AchievementAwardSource;
  dedupeKey: string;
  status: AchievementStatus;
}): PlannedAchievementAward {
  return {
    userId: input.userId,
    code: input.code,
    awardedAt: input.awardedAt,
    source: input.source,
    dedupeKey: input.dedupeKey,
    pointsAwarded: input.status.points,
    progressValue: input.status.progress.current,
    thresholdValue: input.status.progress.target,
    context: {
      current: input.status.progress.current,
      target: input.status.progress.target,
      unit: input.status.progress.unit,
    },
  };
}

function cloneRecord(
  code: AchievementCode,
  record?: StoredAchievementRecord,
): StoredAchievementRecord {
  return {
    code,
    awardCount: record?.awardCount ?? 0,
    firstAwardedAt: record?.firstAwardedAt ?? null,
    lastAwardedAt: record?.lastAwardedAt ?? null,
    state: record?.state ?? null,
  };
}

export function buildAchievementAwardPlan(input: {
  userId: string;
  evaluatedAt: string;
  source: AchievementAwardSource;
  statuses: AchievementStatus[];
  records: StoredAchievementRecord[];
}) {
  const records = new Map(input.records.map((record) => [record.code, record]));
  const nextRecords = new Map(records);
  const awards: PlannedAchievementAward[] = [];

  for (const status of input.statuses) {
    const rule = getRepeatRule(status.code);

    if (rule.mode === "external") {
      continue;
    }

    const record = cloneRecord(status.code, records.get(status.code));

    if (rule.mode === "once") {
      if (status.isQualifiedNow && record.awardCount === 0) {
        const awardedAt = status.unlockedAt ?? input.evaluatedAt;
        awards.push(
          createAward({
            userId: input.userId,
            code: status.code,
            awardedAt,
            source: input.source,
            dedupeKey: `${input.userId}:${status.code}:award:1`,
            status,
          }),
        );
        record.awardCount = 1;
        record.firstAwardedAt = awardedAt;
        record.lastAwardedAt = awardedAt;
      }
    }

    if (rule.mode === "threshold_step") {
      const currentStep = Math.floor(
        status.progress.current / status.progress.target,
      );

      if (currentStep > record.awardCount) {
        for (
          let stepIndex = record.awardCount + 1;
          stepIndex <= currentStep;
          stepIndex += 1
        ) {
          const awardedAt =
            stepIndex === 1 && status.unlockedAt
              ? status.unlockedAt
              : input.evaluatedAt;
          awards.push(
            createAward({
              userId: input.userId,
              code: status.code,
              awardedAt,
              source: input.source,
              dedupeKey: `${input.userId}:${status.code}:step:${stepIndex}`,
              status,
            }),
          );
        }
        record.awardCount = currentStep;
        record.firstAwardedAt =
          record.firstAwardedAt ?? status.unlockedAt ?? input.evaluatedAt;
        record.lastAwardedAt = input.evaluatedAt;
      }
    }

    if (rule.mode === "recross") {
      const lastQualified =
        record.state?.lastQualified ??
        (record.awardCount > 0 && status.isQualifiedNow);

      if (status.isQualifiedNow && !lastQualified) {
        const nextIndex = record.awardCount + 1;
        const awardedAt = status.unlockedAt ?? input.evaluatedAt;
        awards.push(
          createAward({
            userId: input.userId,
            code: status.code,
            awardedAt,
            source: input.source,
            dedupeKey: `${input.userId}:${status.code}:award:${nextIndex}`,
            status,
          }),
        );
        record.awardCount = nextIndex;
        record.firstAwardedAt = record.firstAwardedAt ?? awardedAt;
        record.lastAwardedAt = awardedAt;
      }

      record.state = {
        lastQualified: status.isQualifiedNow,
      };
    }

    if (
      record.awardCount > 0 ||
      record.state?.lastQualified !== undefined ||
      records.has(status.code)
    ) {
      nextRecords.set(status.code, record);
    }
  }

  return {
    awards,
    records: nextRecords,
  };
}

export function mergeAchievementRecords(
  statuses: AchievementStatus[],
  records: Map<AchievementCode, StoredAchievementRecord>,
) {
  return statuses.map((status) => {
    const record = records.get(status.code);

    return {
      ...status,
      unlocked: (record?.awardCount ?? 0) > 0,
      unlockedAt: record?.lastAwardedAt ?? null,
      firstAwardedAt: record?.firstAwardedAt ?? null,
      lastAwardedAt: record?.lastAwardedAt ?? null,
      awardCount: record?.awardCount ?? 0,
    } satisfies AchievementStatus;
  });
}
