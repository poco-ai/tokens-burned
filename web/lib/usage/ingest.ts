import { prisma } from "@/lib/prisma";
import type { ingestRequestSchema } from "./contracts";

type IngestPayload = ReturnType<typeof ingestRequestSchema.parse>;
type UsageWriteClient = Pick<
  typeof prisma,
  "device" | "usageApiKey" | "usageBucket" | "usageSession"
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
    input.payload.buckets.map((bucket) =>
      db.usageBucket.upsert({
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
          projectLabel: bucket.projectLabel,
          inputTokens: bucket.inputTokens,
          outputTokens: bucket.outputTokens,
          cachedTokens: bucket.cachedTokens,
          totalTokens: bucket.totalTokens,
        },
        create: {
          userId: input.userId,
          apiKeyId: input.apiKeyId ?? undefined,
          deviceId: input.payload.device.deviceId,
          source: bucket.source,
          model: bucket.model,
          projectKey: bucket.projectKey,
          projectLabel: bucket.projectLabel,
          bucketStart: new Date(bucket.bucketStart),
          inputTokens: bucket.inputTokens,
          outputTokens: bucket.outputTokens,
          cachedTokens: bucket.cachedTokens,
          totalTokens: bucket.totalTokens,
        },
      }),
    ),
  );
}

export async function upsertSessions(
  db: UsageWriteClient,
  input: IngestUsagePayloadInput,
) {
  await Promise.all(
    input.payload.sessions.map((session) =>
      db.usageSession.upsert({
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
        },
      }),
    ),
  );
}

export async function ingestUsagePayload(input: IngestUsagePayloadInput) {
  const seenAt = new Date();

  return prisma.$transaction(async (tx) => {
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

    await upsertBuckets(tx, input);
    await upsertSessions(tx, input);

    return {
      ok: true,
      bucketCount: input.payload.buckets.length,
      sessionCount: input.payload.sessions.length,
      deviceId: input.payload.device.deviceId,
    };
  });
}
