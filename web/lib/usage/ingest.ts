import { synchronizeAchievementsForUser } from "@/lib/achievements/queries";
import {
  collectAffectedLeaderboardDates,
  findExistingSessionStartDates,
  invalidateLeaderboardSnapshots,
  recomputeLeaderboardUserDays,
} from "@/lib/leaderboard/aggregates";
import { getPricingCatalog } from "@/lib/pricing/catalog";
import {
  estimateCostUsd,
  resolveOfficialPricingMatch,
} from "@/lib/pricing/resolve";
import { prisma } from "@/lib/prisma";
import { tokenCountToBigInt } from "@/lib/token-counts";
import type { ingestRequestSchema } from "./contracts";

type IngestPayload = ReturnType<typeof ingestRequestSchema.parse>;
type UsageWriteClient = Pick<
  typeof prisma,
  | "device"
  | "usageApiKey"
  | "usageBucket"
  | "usageSession"
  | "leaderboardUserDay"
  | "leaderboardSnapshot"
>;

type UpsertDeviceInput = {
  userId: string;
  apiKeyId?: string | null;
  device: IngestPayload["device"];
  seenAt: Date;
};

type IngestUsagePayloadInput = {
  userId: string;
  apiKeyId?: string | null;
  payload: IngestPayload;
};

type DeleteUsageDeviceSnapshotInput = {
  userId: string;
  deviceId: string;
};

type NormalizedSessionUsage = {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  primaryModel: string;
  estimatedCostUsd: number | null;
};

function buildUsageSessionWriteInput(input: NormalizedSessionUsage) {
  return {
    inputTokens: tokenCountToBigInt(input.inputTokens),
    outputTokens: tokenCountToBigInt(input.outputTokens),
    reasoningTokens: tokenCountToBigInt(input.reasoningTokens),
    cachedTokens: tokenCountToBigInt(input.cachedTokens),
    totalTokens: tokenCountToBigInt(input.totalTokens),
    primaryModel: input.primaryModel,
    estimatedCostUsd: input.estimatedCostUsd,
  };
}

function buildUsageBucketWriteInput(bucket: IngestPayload["buckets"][number]) {
  return {
    projectLabel: bucket.projectLabel,
    inputTokens: tokenCountToBigInt(bucket.inputTokens),
    outputTokens: tokenCountToBigInt(bucket.outputTokens),
    reasoningTokens: tokenCountToBigInt(bucket.reasoningTokens),
    cachedTokens: tokenCountToBigInt(bucket.cachedTokens),
    totalTokens: tokenCountToBigInt(bucket.totalTokens),
  };
}

function normalizeSessionUsage(
  session: IngestPayload["sessions"][number],
  catalog: Awaited<ReturnType<typeof getPricingCatalog>>,
): NormalizedSessionUsage | null {
  const aggregatedFromModels = session.modelUsages?.reduce(
    (result, modelUsage) => {
      const modelTotalTokens =
        modelUsage.inputTokens +
        modelUsage.outputTokens +
        modelUsage.reasoningTokens +
        modelUsage.cachedTokens;

      result.inputTokens += modelUsage.inputTokens;
      result.outputTokens += modelUsage.outputTokens;
      result.reasoningTokens += modelUsage.reasoningTokens;
      result.cachedTokens += modelUsage.cachedTokens;
      result.totalTokens += modelTotalTokens;

      const match = resolveOfficialPricingMatch(catalog, modelUsage.model);
      const estimate = estimateCostUsd(
        {
          inputTokens: modelUsage.inputTokens,
          outputTokens: modelUsage.outputTokens,
          reasoningTokens: modelUsage.reasoningTokens,
          cachedTokens: modelUsage.cachedTokens,
        },
        match?.cost,
      );

      if (estimate) {
        result.estimatedCostUsd += estimate.totalUsd;
        result.hasPricedModel = true;
      }

      return result;
    },
    {
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      hasPricedModel: false,
    },
  );

  const hasExplicitUsage =
    session.inputTokens !== undefined ||
    session.outputTokens !== undefined ||
    session.reasoningTokens !== undefined ||
    session.cachedTokens !== undefined ||
    session.totalTokens !== undefined;

  if (!aggregatedFromModels && !hasExplicitUsage) {
    return null;
  }

  if (aggregatedFromModels) {
    return {
      inputTokens: aggregatedFromModels.inputTokens,
      outputTokens: aggregatedFromModels.outputTokens,
      reasoningTokens: aggregatedFromModels.reasoningTokens,
      cachedTokens: aggregatedFromModels.cachedTokens,
      totalTokens: aggregatedFromModels.totalTokens,
      primaryModel:
        session.primaryModel ?? session.modelUsages?.[0]?.model ?? "",
      estimatedCostUsd: aggregatedFromModels.hasPricedModel
        ? aggregatedFromModels.estimatedCostUsd
        : null,
    };
  }

  const inputTokens = session.inputTokens ?? 0;
  const outputTokens = session.outputTokens ?? 0;
  const reasoningTokens = session.reasoningTokens ?? 0;
  const cachedTokens = session.cachedTokens ?? 0;

  return {
    inputTokens,
    outputTokens,
    reasoningTokens,
    cachedTokens,
    totalTokens:
      session.totalTokens ??
      inputTokens + outputTokens + reasoningTokens + cachedTokens,
    primaryModel: session.primaryModel ?? "",
    estimatedCostUsd: null,
  };
}

export async function upsertDevice(
  db: UsageWriteClient,
  input: UpsertDeviceInput,
) {
  return db.device.upsert({
    where: {
      userId_deviceId: {
        userId: input.userId,
        deviceId: input.device.deviceId,
      },
    },
    update: {
      hostname: input.device.hostname,
      lastSeenAt: input.seenAt,
      lastApiKeyId: input.apiKeyId ?? undefined,
    },
    create: {
      userId: input.userId,
      deviceId: input.device.deviceId,
      hostname: input.device.hostname,
      lastSeenAt: input.seenAt,
      lastApiKeyId: input.apiKeyId ?? undefined,
    },
  });
}

export async function upsertBuckets(
  db: UsageWriteClient,
  input: IngestUsagePayloadInput,
) {
  await Promise.all(
    input.payload.buckets.map((bucket) => {
      const bucketWrite = buildUsageBucketWriteInput(bucket);

      return db.usageBucket.upsert({
        where: {
          userId_deviceId_source_model_projectKey_bucketStart: {
            userId: input.userId,
            deviceId: input.payload.device.deviceId,
            source: bucket.source,
            model: bucket.model,
            projectKey: bucket.projectKey,
            bucketStart: new Date(bucket.bucketStart),
          },
        },
        update: {
          apiKeyId: input.apiKeyId ?? undefined,
          ...bucketWrite,
        },
        create: {
          userId: input.userId,
          apiKeyId: input.apiKeyId ?? undefined,
          deviceId: input.payload.device.deviceId,
          source: bucket.source,
          model: bucket.model,
          projectKey: bucket.projectKey,
          bucketStart: new Date(bucket.bucketStart),
          ...bucketWrite,
        },
      });
    }),
  );
}

export async function upsertSessions(
  db: UsageWriteClient,
  input: IngestUsagePayloadInput,
  catalog: Awaited<ReturnType<typeof getPricingCatalog>>,
) {
  await Promise.all(
    input.payload.sessions.map((session) => {
      const normalizedUsage = normalizeSessionUsage(session, catalog);
      const sessionUsageWrite =
        normalizedUsage == null
          ? null
          : buildUsageSessionWriteInput(normalizedUsage);

      return db.usageSession.upsert({
        where: {
          userId_deviceId_source_sessionHash: {
            userId: input.userId,
            deviceId: input.payload.device.deviceId,
            source: session.source,
            sessionHash: session.sessionHash,
          },
        },
        update: {
          apiKeyId: input.apiKeyId ?? undefined,
          projectKey: session.projectKey,
          projectLabel: session.projectLabel,
          firstMessageAt: new Date(session.firstMessageAt),
          lastMessageAt: new Date(session.lastMessageAt),
          durationSeconds: session.durationSeconds,
          activeSeconds: session.activeSeconds,
          messageCount: session.messageCount,
          userMessageCount: session.userMessageCount,
          ...(sessionUsageWrite ?? {}),
        },
        create: {
          userId: input.userId,
          apiKeyId: input.apiKeyId ?? undefined,
          deviceId: input.payload.device.deviceId,
          source: session.source,
          projectKey: session.projectKey,
          projectLabel: session.projectLabel,
          sessionHash: session.sessionHash,
          firstMessageAt: new Date(session.firstMessageAt),
          lastMessageAt: new Date(session.lastMessageAt),
          durationSeconds: session.durationSeconds,
          activeSeconds: session.activeSeconds,
          messageCount: session.messageCount,
          userMessageCount: session.userMessageCount,
          ...(sessionUsageWrite ?? {
            inputTokens: tokenCountToBigInt(0),
            outputTokens: tokenCountToBigInt(0),
            reasoningTokens: tokenCountToBigInt(0),
            cachedTokens: tokenCountToBigInt(0),
            totalTokens: tokenCountToBigInt(0),
            primaryModel: "",
            estimatedCostUsd: null,
          }),
        },
      });
    }),
  );
}

export async function deleteUsageDeviceSnapshot(
  input: DeleteUsageDeviceSnapshotInput,
) {
  const result = await prisma.$transaction(async (tx) => {
    const [existingBuckets, existingSessions] = await Promise.all([
      tx.usageBucket.findMany({
        where: {
          userId: input.userId,
          deviceId: input.deviceId,
        },
        select: {
          bucketStart: true,
        },
      }),
      tx.usageSession.findMany({
        where: {
          userId: input.userId,
          deviceId: input.deviceId,
        },
        select: {
          firstMessageAt: true,
        },
      }),
    ]);

    const affectedDates = collectAffectedLeaderboardDates({
      bucketStarts: existingBuckets.map((bucket) => bucket.bucketStart),
      sessionStarts: existingSessions.map((session) => session.firstMessageAt),
    });

    const [deletedBuckets, deletedSessions] = await Promise.all([
      tx.usageBucket.deleteMany({
        where: {
          userId: input.userId,
          deviceId: input.deviceId,
        },
      }),
      tx.usageSession.deleteMany({
        where: {
          userId: input.userId,
          deviceId: input.deviceId,
        },
      }),
    ]);

    if (affectedDates.length > 0) {
      await recomputeLeaderboardUserDays(tx, {
        userId: input.userId,
        dates: affectedDates,
      });
      await invalidateLeaderboardSnapshots(tx);
    }

    return {
      deletedBuckets: deletedBuckets.count,
      deletedSessions: deletedSessions.count,
    };
  });

  if (result.deletedBuckets > 0 || result.deletedSessions > 0) {
    await synchronizeAchievementsForUser(input.userId, "ingest");
  }

  return result;
}

export async function ingestUsagePayload(input: IngestUsagePayloadInput) {
  const seenAt = new Date();
  const catalog = await getPricingCatalog();

  const result = await prisma.$transaction(async (tx) => {
    await upsertDevice(tx, {
      userId: input.userId,
      apiKeyId: input.apiKeyId,
      device: input.payload.device,
      seenAt,
    });

    if (input.apiKeyId) {
      await tx.usageApiKey.update({
        where: { id: input.apiKeyId },
        data: { lastUsedAt: seenAt },
      });
    }

    const existingSessionStarts = await findExistingSessionStartDates(tx, {
      userId: input.userId,
      deviceId: input.payload.device.deviceId,
      sessions: input.payload.sessions.map((session) => ({
        source: session.source,
        sessionHash: session.sessionHash,
      })),
    });

    await upsertBuckets(tx, input);
    await upsertSessions(tx, input, catalog);

    const affectedDates = collectAffectedLeaderboardDates({
      bucketStarts: input.payload.buckets.map((bucket) => bucket.bucketStart),
      sessionStarts: input.payload.sessions.map(
        (session) => session.firstMessageAt,
      ),
      existingSessionStarts,
    });

    if (affectedDates.length > 0) {
      await recomputeLeaderboardUserDays(tx, {
        userId: input.userId,
        dates: affectedDates,
      });
      await invalidateLeaderboardSnapshots(tx);
    }

    return {
      ok: true,
      bucketCount: input.payload.buckets.length,
      sessionCount: input.payload.sessions.length,
      deviceId: input.payload.device.deviceId,
    };
  });

  await synchronizeAchievementsForUser(input.userId, "ingest");

  return result;
}
