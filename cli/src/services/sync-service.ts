import { hostname } from "node:os";
import type { Config } from "../infrastructure/config/manager";
import { ApiClient } from "../infrastructure/api/client";
import { runAllParsers } from "./parser-service";
import { logger } from "../utils/logger";

const BATCH_SIZE = 100;
const SESSION_BATCH_SIZE = 500;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatTime(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export interface SyncOptions {
  throws?: boolean;
  quiet?: boolean;
}

export async function runSync(config: Config, opts: SyncOptions = {}): Promise<number> {
  const { throws = false, quiet = false } = opts;

  // Run all parsers
  const { buckets: allBuckets, sessions: allSessions, parserResults } = await runAllParsers();

  if (allBuckets.length === 0 && allSessions.length === 0) {
    if (!quiet) logger.info("No new usage data found.");
    return 0;
  }

  if (!quiet && parserResults.length > 0) {
    for (const p of parserResults) {
      const parts: string[] = [];
      if (p.buckets > 0) parts.push(`${p.buckets} buckets`);
      if (p.sessions > 0) parts.push(`${p.sessions} sessions`);
      logger.info(`  ${p.source}: ${parts.join(", ")}`);
    }
  }

  // Add hostname
  const host = hostname().replace(/\.local$/, "");
  for (const b of allBuckets) {
    b.hostname = host;
  }
  for (const s of allSessions) {
    s.hostname = host;
  }

  // Privacy: check if user allows project name upload
  const apiUrl = config.apiUrl || "https://vibecafe.ai";
  const apiClient = new ApiClient(apiUrl, config.apiKey);

  let settings;
  try {
    settings = await apiClient.fetchSettings();
  } catch {
    settings = null;
  }

  const uploadProject = settings?.uploadProject === true;

  if (uploadProject) {
    logger.info("📂 项目名: 上传 (可在设置中关闭)");
  } else {
    logger.info("🔒 项目名: 已隐藏");
    for (const b of allBuckets) {
      b.project = "unknown";
    }
    for (const s of allSessions) {
      s.project = "unknown";
    }
  }

  // Upload in batches
  let totalIngested = 0;
  let totalSessionsSynced = 0;
  const bucketBatches = Math.ceil(allBuckets.length / BATCH_SIZE);
  const sessionBatches = Math.ceil(allSessions.length / SESSION_BATCH_SIZE);
  const totalBatches = Math.max(bucketBatches, sessionBatches, 1);

  const parts: string[] = [];
  if (allBuckets.length > 0) parts.push(`${allBuckets.length} buckets`);
  if (allSessions.length > 0) parts.push(`${allSessions.length} sessions`);
  logger.info(`Uploading ${parts.join(" + ")} (${totalBatches} batch${totalBatches > 1 ? "es" : ""})...`);

  try {
    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const batch = allBuckets.slice(batchIdx * BATCH_SIZE, (batchIdx + 1) * BATCH_SIZE);
      const batchSessions = allSessions.slice(
        batchIdx * SESSION_BATCH_SIZE,
        (batchIdx + 1) * SESSION_BATCH_SIZE
      );
      const batchNum = batchIdx + 1;
      const prefix = totalBatches > 1 ? `  [${batchNum}/${totalBatches}] ` : "  ";

      const result = await apiClient.ingest(batch, batchSessions.length > 0 ? batchSessions : undefined, (sent, total) => {
        const pct = Math.round((sent / total) * 100);
        process.stdout.write(`\r${prefix}${formatBytes(sent)}/${formatBytes(total)} (${pct}%)\x1b[K`);
      });

      totalIngested += result.ingested ?? batch.length;
      totalSessionsSynced += result.sessions ?? 0;
    }

    if (totalBatches > 1 || allBuckets.length > 0) {
      process.stdout.write("\n");
    }

    const syncParts = [`${totalIngested} buckets`];
    if (totalSessionsSynced > 0) syncParts.push(`${totalSessionsSynced} sessions`);
    logger.info(`Synced ${syncParts.join(" + ")}.`);

    if (!quiet && totalSessionsSynced > 0) {
      const totalActive = allSessions.reduce((s, x) => s + x.activeSeconds, 0);
      const totalDuration = allSessions.reduce((s, x) => s + x.durationSeconds, 0);
      const totalMsgs = allSessions.reduce((s, x) => s + x.messageCount, 0);
      logger.info(
        `  active: ${formatTime(totalActive)} / total: ${formatTime(totalDuration)}, ${totalMsgs} messages`
      );
    }

    if (!quiet) logger.info(`\nView your dashboard at: ${apiUrl}/usage`);

    return totalIngested;
  } catch (err) {
    const httpErr = err as Error & { statusCode?: number };
    if (httpErr.message === "UNAUTHORIZED") {
      logger.error("Invalid API key. Run `tokens-burned init` to reconfigure.");
      if (throws) throw err;
      process.exit(1);
    }
    // Report partial success
    if (totalIngested > 0) {
      logger.error(`Sync partially completed (${totalIngested} buckets uploaded). ${httpErr.message}`);
    } else {
      logger.error(`Sync failed: ${httpErr.message}`);
    }
    if (throws) throw err;
    process.exit(1);
  }
}
