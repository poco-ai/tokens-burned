import { prisma } from "@/lib/prisma";
import { getUtcDateKey, startOfUtcDay } from "./date";

type LeaderboardAggregateWriteClient = Pick<
  typeof prisma,
  "usageBucket" | "usageSession" | "leaderboardUserDay" | "leaderboardSnapshot"
>;

type LeaderboardAccumulator = {
  statDate: Date;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  activeSeconds: number;
  sessions: number;
  messages: number;
  userMessages: number;
};

function createAccumulator(statDate: Date): LeaderboardAccumulator {
  return {
    statDate,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    cachedTokens: 0,
    totalTokens: 0,
    activeSeconds: 0,
    sessions: 0,
    messages: 0,
    userMessages: 0,
  };
}

function ensureAccumulator(
  rows: Map<string, LeaderboardAccumulator>,
  statDate: Date,
) {
  const key = getUtcDateKey(statDate);
  const existing = rows.get(key);

  if (existing) {
    return existing;
  }

  const next = createAccumulator(startOfUtcDay(statDate));
  rows.set(key, next);

  return next;
}

function normalizeDate(value: Date | string) {
  return startOfUtcDay(value instanceof Date ? value : new Date(value));
}

export function collectAffectedLeaderboardDates(input: {
  bucketStarts?: Array<Date | string>;
  sessionStarts?: Array<Date | string>;
  existingSessionStarts?: Array<Date | string>;
}) {
  const rows = [
    ...(input.bucketStarts ?? []),
    ...(input.sessionStarts ?? []),
    ...(input.existingSessionStarts ?? []),
  ].map(normalizeDate);

  return Array.from(
    new Map(rows.map((value) => [value.toISOString(), value])).values(),
  ).sort((left, right) => left.getTime() - right.getTime());
}

export async function findExistingSessionStartDates(
  db: Pick<typeof prisma, "usageSession">,
  input: {
    userId: string;
    deviceId: string;
    sessions: Array<{
      source: string;
      sessionHash: string;
    }>;
  },
) {
  if (input.sessions.length === 0) {
    return [];
  }

  const existing = await db.usageSession.findMany({
    where: {
      userId: input.userId,
      deviceId: input.deviceId,
      OR: input.sessions.map((session) => ({
        source: session.source,
        sessionHash: session.sessionHash,
      })),
    },
    select: {
      firstMessageAt: true,
    },
  });

  return existing.map((row) => row.firstMessageAt);
}

export async function invalidateLeaderboardSnapshots(
  db: Pick<typeof prisma, "leaderboardSnapshot"> = prisma,
) {
  await db.leaderboardSnapshot.deleteMany({});
}

export async function recomputeLeaderboardUserDays(
  db: LeaderboardAggregateWriteClient,
  input: {
    userId: string;
    dates: Date[];
  },
) {
  if (input.dates.length === 0) {
    return;
  }

  const sortedDates = input.dates
    .map((value) => startOfUtcDay(value))
    .sort((left, right) => left.getTime() - right.getTime());
  const rangeStart = sortedDates[0];
  const rangeEnd = new Date(sortedDates[sortedDates.length - 1].getTime());
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

  const [buckets, sessions] = await Promise.all([
    db.usageBucket.findMany({
      where: {
        userId: input.userId,
        bucketStart: {
          gte: rangeStart,
          lt: rangeEnd,
        },
      },
      select: {
        bucketStart: true,
        inputTokens: true,
        outputTokens: true,
        reasoningTokens: true,
        cachedTokens: true,
        totalTokens: true,
      },
    }),
    db.usageSession.findMany({
      where: {
        userId: input.userId,
        firstMessageAt: {
          gte: rangeStart,
          lt: rangeEnd,
        },
      },
      select: {
        firstMessageAt: true,
        activeSeconds: true,
        messageCount: true,
        userMessageCount: true,
      },
    }),
  ]);

  const rows = new Map<string, LeaderboardAccumulator>();

  for (const bucket of buckets) {
    const row = ensureAccumulator(rows, bucket.bucketStart);
    row.inputTokens += bucket.inputTokens;
    row.outputTokens += bucket.outputTokens;
    row.reasoningTokens += bucket.reasoningTokens;
    row.cachedTokens += bucket.cachedTokens;
    row.totalTokens += bucket.totalTokens;
  }

  for (const session of sessions) {
    const row = ensureAccumulator(rows, session.firstMessageAt);
    row.activeSeconds += session.activeSeconds;
    row.sessions += 1;
    row.messages += session.messageCount;
    row.userMessages += session.userMessageCount;
  }

  for (const statDate of sortedDates) {
    const key = getUtcDateKey(statDate);
    const row = rows.get(key);

    if (!row) {
      await db.leaderboardUserDay.deleteMany({
        where: {
          userId: input.userId,
          statDate,
        },
      });
      continue;
    }

    await db.leaderboardUserDay.upsert({
      where: {
        userId_statDate: {
          userId: input.userId,
          statDate,
        },
      },
      update: {
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        reasoningTokens: row.reasoningTokens,
        cachedTokens: row.cachedTokens,
        totalTokens: row.totalTokens,
        activeSeconds: row.activeSeconds,
        sessions: row.sessions,
        messages: row.messages,
        userMessages: row.userMessages,
      },
      create: {
        userId: input.userId,
        statDate,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        reasoningTokens: row.reasoningTokens,
        cachedTokens: row.cachedTokens,
        totalTokens: row.totalTokens,
        activeSeconds: row.activeSeconds,
        sessions: row.sessions,
        messages: row.messages,
        userMessages: row.userMessages,
      },
    });
  }
}
