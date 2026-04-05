import { hostname } from "node:os";
import { toProjectIdentity } from "../domain/project-identity";
import type {
  ApiSettings,
  DeviceMetadata,
  SessionMetadata,
  TokenBucket,
  UploadSessionMetadata,
  UploadTokenBucket,
} from "../domain/types";
import {
  buildUploadManifestScope,
  diffUploadManifest,
  type UploadManifest,
  type UploadManifestScopeChange,
} from "../domain/upload-manifest";
import { ApiClient, getIngestPayloadSize } from "../infrastructure/api/client";
import {
  type Config,
  getOrCreateDeviceId,
} from "../infrastructure/config/manager";
import { getDeviceFingerprint } from "../infrastructure/device/fingerprint";
import {
  describeExistingSyncLock,
  tryAcquireSyncLock,
} from "../infrastructure/runtime/lock";
import {
  markSyncFailed,
  markSyncStarted,
  markSyncSucceeded,
  type SyncSource,
} from "../infrastructure/runtime/state";
import {
  loadUploadManifest,
  saveUploadManifest,
} from "../infrastructure/runtime/upload-manifest";
import { logger } from "../utils/logger";
import { runAllParsers } from "./parser-service";

const BATCH_SIZE = 100;
const SESSION_BATCH_SIZE = 500;
const PROGRESS_BAR_WIDTH = 28;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function renderProgressBar(progress: number): string {
  const safeProgress = Math.max(0, Math.min(progress, 1));
  const filled = Math.round(safeProgress * PROGRESS_BAR_WIDTH);
  return `${"█".repeat(filled)}${"░".repeat(PROGRESS_BAR_WIDTH - filled)}`;
}

function writeUploadProgress(
  sent: number,
  total: number,
  batchNum: number,
  totalBatches: number,
): void {
  const pct = total > 0 ? Math.round((sent / total) * 100) : 100;
  const progressBar = renderProgressBar(total > 0 ? sent / total : 1);
  const batchLabel =
    totalBatches > 1 ? ` · batch ${batchNum}/${totalBatches}` : "";

  process.stdout.write(
    `\r  Uploading ${progressBar} ${String(pct).padStart(3, " ")}% · ${formatBytes(sent)}/${formatBytes(total)}${batchLabel}\x1b[K`,
  );
}

function formatScopeChangeReason(reason: UploadManifestScopeChange): string {
  switch (reason) {
    case "server_or_api_key":
      return "server/API key";
    case "device_id":
      return "device ID";
    case "project_identity":
      return "project identity settings";
  }
}

function persistUploadManifest(manifest: UploadManifest, quiet: boolean): void {
  try {
    saveUploadManifest(manifest);
  } catch (error) {
    if (!quiet) {
      logger.warn(
        `Uploaded data, but failed to update the local sync manifest: ${(error as Error).message}`,
      );
    }
  }
}

export interface SyncOptions {
  source?: SyncSource;
  throws?: boolean;
  quiet?: boolean;
}

export interface SyncResult {
  buckets: number;
  sessions: number;
  skipped?: "locked";
}

function toDeviceMetadata(config: Config): DeviceMetadata {
  const deviceFingerprint = getDeviceFingerprint();

  return {
    deviceId: getOrCreateDeviceId(config),
    hostname: hostname().replace(/\.local$/, ""),
    ...(deviceFingerprint ? { deviceFingerprint } : {}),
  };
}

function toUploadBuckets(
  buckets: TokenBucket[],
  settings: ApiSettings,
  device: DeviceMetadata,
): UploadTokenBucket[] {
  const aggregated = new Map<string, UploadTokenBucket>();

  for (const bucket of buckets) {
    const project = toProjectIdentity({
      project: bucket.project || "unknown",
      mode: settings.projectMode,
      salt: settings.projectHashSalt,
    });
    const key = [
      bucket.source,
      bucket.model,
      project.projectKey,
      bucket.bucketStart,
      device.deviceId,
    ].join("|");

    const existing = aggregated.get(key);
    if (existing) {
      existing.inputTokens += bucket.inputTokens;
      existing.outputTokens += bucket.outputTokens;
      existing.reasoningTokens += bucket.reasoningTokens || 0;
      existing.cachedTokens += bucket.cachedTokens || 0;
      existing.totalTokens += bucket.totalTokens;
      continue;
    }

    aggregated.set(key, {
      source: bucket.source,
      model: bucket.model,
      projectKey: project.projectKey,
      projectLabel: project.projectLabel,
      bucketStart: bucket.bucketStart,
      deviceId: device.deviceId,
      hostname: device.hostname,
      inputTokens: bucket.inputTokens,
      outputTokens: bucket.outputTokens,
      reasoningTokens: bucket.reasoningTokens || 0,
      cachedTokens: bucket.cachedTokens || 0,
      totalTokens: bucket.totalTokens,
    });
  }

  return Array.from(aggregated.values());
}

function toUploadSessions(
  sessions: SessionMetadata[],
  settings: ApiSettings,
  device: DeviceMetadata,
): UploadSessionMetadata[] {
  return sessions.map((session) => {
    const project = toProjectIdentity({
      project: session.project || "unknown",
      mode: settings.projectMode,
      salt: settings.projectHashSalt,
    });

    return {
      source: session.source,
      projectKey: project.projectKey,
      projectLabel: project.projectLabel,
      sessionHash: session.sessionHash,
      deviceId: device.deviceId,
      hostname: device.hostname,
      firstMessageAt: session.firstMessageAt,
      lastMessageAt: session.lastMessageAt,
      durationSeconds: session.durationSeconds,
      activeSeconds: session.activeSeconds,
      messageCount: session.messageCount,
      userMessageCount: session.userMessageCount,
      inputTokens: session.inputTokens,
      outputTokens: session.outputTokens,
      reasoningTokens: session.reasoningTokens,
      cachedTokens: session.cachedTokens,
      totalTokens: session.totalTokens,
      primaryModel: session.primaryModel,
      modelUsages: session.modelUsages,
    };
  });
}

class SyncFailure extends Error {
  constructor(
    message: string,
    readonly kind: "auth_error" | "error",
    readonly causeError?: Error,
  ) {
    super(message);
  }
}

export async function runSync(
  config: Config,
  opts: SyncOptions = {},
): Promise<SyncResult> {
  const { quiet = false, source = "manual", throws = false } = opts;

  const lock = tryAcquireSyncLock(source);
  if (!lock) {
    const detail = describeExistingSyncLock();
    const message = detail
      ? `Another sync is already running (${detail}). Skipping.`
      : "Another sync is already running. Skipping.";

    markSyncFailed(source, message, "skipped_locked");
    logger.info(message);
    return {
      buckets: 0,
      sessions: 0,
      skipped: "locked",
    };
  }

  markSyncStarted(source);

  let totalIngested = 0;
  let totalSessionsSynced = 0;
  let caughtError: SyncFailure | null = null;

  try {
    const {
      buckets: allBuckets,
      sessions: allSessions,
      parserResults,
    } = await runAllParsers();

    if (allBuckets.length === 0 && allSessions.length === 0) {
      if (!quiet) {
        logger.info("No new usage data found.");
      }
      markSyncSucceeded(source, { buckets: 0, sessions: 0 });
      return { buckets: 0, sessions: 0 };
    }

    if (!quiet && parserResults.length > 0) {
      for (const p of parserResults) {
        const parts: string[] = [];
        if (p.buckets > 0) parts.push(`${p.buckets} buckets`);
        if (p.sessions > 0) parts.push(`${p.sessions} sessions`);
        logger.info(`  ${p.source}: ${parts.join(", ")}`);
      }
    }

    const apiUrl = config.apiUrl || "https://token.poco-ai.com";
    const apiClient = new ApiClient(apiUrl, config.apiKey);

    let settings: ApiSettings | null;
    try {
      settings = await apiClient.fetchSettings();
    } catch (error) {
      if ((error as Error).message === "UNAUTHORIZED") {
        throw new SyncFailure(
          "Invalid API key. Run `tokenarena init` to reconfigure.",
          "auth_error",
          error as Error,
        );
      }

      settings = null;
    }

    if (!settings) {
      throw new SyncFailure(
        "Could not fetch usage settings. Check your server URL and API key.",
        "error",
      );
    }

    const device = toDeviceMetadata(config);
    const manifestScope = buildUploadManifestScope({
      apiKey: config.apiKey,
      apiUrl,
      deviceId: device.deviceId,
      settings,
    });
    const uploadBuckets = toUploadBuckets(allBuckets, settings, device);
    const uploadSessions = toUploadSessions(allSessions, settings, device);
    const uploadDiff = diffUploadManifest({
      buckets: uploadBuckets,
      previous: loadUploadManifest(),
      scope: manifestScope,
      sessions: uploadSessions,
    });
    const changedBuckets = uploadDiff.bucketsToUpload;
    const changedSessions = uploadDiff.sessionsToUpload;

    if (!quiet && uploadDiff.scopeChangedReasons.length > 0) {
      logger.warn(
        `Upload scope changed (${uploadDiff.scopeChangedReasons.map(formatScopeChangeReason).join(", ")}). TokenArena will upload the current snapshot again, but existing remote records from the previous scope will not be deleted automatically.`,
      );
    }

    if (
      !quiet &&
      (uploadDiff.removedBuckets > 0 || uploadDiff.removedSessions > 0)
    ) {
      const parts: string[] = [];
      if (uploadDiff.removedBuckets > 0) {
        parts.push(`${uploadDiff.removedBuckets} buckets`);
      }
      if (uploadDiff.removedSessions > 0) {
        parts.push(`${uploadDiff.removedSessions} sessions`);
      }
      logger.warn(
        `Detected ${parts.join(" + ")} that were present in the previous local snapshot but are missing now. Remote deletions are not supported yet, so renamed projects or removed local logs may leave stale data online.`,
      );
    }

    if (changedBuckets.length === 0 && changedSessions.length === 0) {
      if (!quiet) {
        const skippedParts: string[] = [];
        if (uploadDiff.unchangedBuckets > 0) {
          skippedParts.push(`${uploadDiff.unchangedBuckets} unchanged buckets`);
        }
        if (uploadDiff.unchangedSessions > 0) {
          skippedParts.push(
            `${uploadDiff.unchangedSessions} unchanged sessions`,
          );
        }
        logger.info(
          skippedParts.length > 0
            ? `No new or updated usage data to upload. Skipped ${skippedParts.join(" + ")}.`
            : "No new or updated usage data to upload.",
        );
      }
      persistUploadManifest(uploadDiff.nextManifest, quiet);
      markSyncSucceeded(source, { buckets: 0, sessions: 0 });
      return { buckets: 0, sessions: 0 };
    }

    const bucketBatches = Math.ceil(changedBuckets.length / BATCH_SIZE);
    const sessionBatches = Math.ceil(
      changedSessions.length / SESSION_BATCH_SIZE,
    );
    const totalBatches = Math.max(bucketBatches, sessionBatches, 1);
    const batchPayloadSizes = Array.from(
      { length: totalBatches },
      (_, batchIdx) =>
        getIngestPayloadSize(
          device,
          changedBuckets.slice(
            batchIdx * BATCH_SIZE,
            (batchIdx + 1) * BATCH_SIZE,
          ),
          changedSessions.slice(
            batchIdx * SESSION_BATCH_SIZE,
            (batchIdx + 1) * SESSION_BATCH_SIZE,
          ),
        ),
    );
    const totalPayloadBytes = batchPayloadSizes.reduce(
      (sum, size) => sum + size,
      0,
    );
    let uploadedBytesBeforeBatch = 0;

    if (!quiet) {
      const parts: string[] = [];
      if (changedBuckets.length > 0) {
        parts.push(`${changedBuckets.length} buckets`);
      }
      if (changedSessions.length > 0) {
        parts.push(`${changedSessions.length} sessions`);
      }
      const skippedParts: string[] = [];
      if (uploadDiff.unchangedBuckets > 0) {
        skippedParts.push(`${uploadDiff.unchangedBuckets} unchanged buckets`);
      }
      if (uploadDiff.unchangedSessions > 0) {
        skippedParts.push(`${uploadDiff.unchangedSessions} unchanged sessions`);
      }
      logger.info(
        `Uploading ${parts.join(" + ")} (${totalBatches} batch${totalBatches > 1 ? "es" : ""}${skippedParts.length > 0 ? `, skipped ${skippedParts.join(" + ")}` : ""})...`,
      );
    }

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const batch = changedBuckets.slice(
        batchIdx * BATCH_SIZE,
        (batchIdx + 1) * BATCH_SIZE,
      );
      const batchSessions = changedSessions.slice(
        batchIdx * SESSION_BATCH_SIZE,
        (batchIdx + 1) * SESSION_BATCH_SIZE,
      );
      const batchNum = batchIdx + 1;

      const result = await apiClient.ingest(
        device,
        batch,
        batchSessions.length > 0 ? batchSessions : undefined,
        quiet
          ? undefined
          : (sent, total) => {
              writeUploadProgress(
                uploadedBytesBeforeBatch + sent,
                totalPayloadBytes || total,
                batchNum,
                totalBatches,
              );
            },
      );

      totalIngested += result.ingested ?? batch.length;
      totalSessionsSynced += result.sessions ?? batchSessions.length;
      uploadedBytesBeforeBatch += batchPayloadSizes[batchIdx] ?? 0;
    }

    if (!quiet && (totalBatches > 1 || changedBuckets.length > 0)) {
      writeUploadProgress(
        totalPayloadBytes,
        totalPayloadBytes,
        totalBatches,
        totalBatches,
      );
      process.stdout.write("\n");
    }

    const syncParts = [`${totalIngested} buckets`];
    if (totalSessionsSynced > 0) {
      syncParts.push(`${totalSessionsSynced} sessions`);
    }
    logger.info(`Synced ${syncParts.join(" + ")}.`);

    if (!quiet) {
      logger.info(`\nView your dashboard at: ${apiUrl}/usage`);
    }

    persistUploadManifest(uploadDiff.nextManifest, quiet);
    markSyncSucceeded(source, {
      buckets: totalIngested,
      sessions: totalSessionsSynced,
    });

    return {
      buckets: totalIngested,
      sessions: totalSessionsSynced,
    };
  } catch (error) {
    const httpErr = error as Error & { statusCode?: number };

    if (httpErr.message === "UNAUTHORIZED") {
      caughtError = new SyncFailure(
        "Invalid API key. Run `tokenarena init` to reconfigure.",
        "auth_error",
        error as Error,
      );
    } else if (error instanceof SyncFailure) {
      caughtError = error;
    } else if (totalIngested > 0) {
      caughtError = new SyncFailure(
        `Sync partially completed (${totalIngested} buckets uploaded). ${httpErr.message}`,
        "error",
        error as Error,
      );
    } else {
      caughtError = new SyncFailure(
        `Sync failed: ${httpErr.message}`,
        "error",
        error as Error,
      );
    }

    markSyncFailed(source, caughtError.message, caughtError.kind);
  } finally {
    lock.release();
  }

  if (!caughtError) {
    return {
      buckets: totalIngested,
      sessions: totalSessionsSynced,
    };
  }

  logger.error(caughtError.message);
  if (throws) {
    throw caughtError.causeError ?? caughtError;
  }
  process.exit(1);
}
