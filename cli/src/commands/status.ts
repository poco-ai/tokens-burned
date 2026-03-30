import { getConfigPath, loadConfig } from "../infrastructure/config/manager";
import { loadSyncState } from "../infrastructure/runtime/state";
import {
  detectInstalledTools,
  getAllTools,
  isToolInstalled,
} from "../parsers/registry";
import { logger } from "../utils/logger";

function formatMaybe(value?: string): string {
  return value || "(never)";
}

export async function runStatus(): Promise<void> {
  const config = loadConfig();
  logger.info("\ntokenarena status\n");

  if (!config?.apiKey) {
    logger.info("  Config: not configured");
    logger.info("  Run `tokenarena init` to set up.\n");
  } else {
    logger.info(`  Config: ${getConfigPath()}`);
    logger.info(`  API key: ${config.apiKey.slice(0, 8)}...`);
    logger.info(`  API URL: ${config.apiUrl || "http://localhost:3000"}`);
    if (config.syncInterval) {
      logger.info(
        `  Sync interval: ${Math.round(config.syncInterval / 60000)}m`,
      );
    }
  }

  logger.info("\n  Detected tools:");
  const detected = detectInstalledTools();
  if (detected.length === 0) {
    logger.info("    (none)\n");
  } else {
    for (const tool of detected) {
      logger.info(`    ${tool.name}`);
    }
    logger.info("");
  }

  logger.info("  All supported tools:");
  for (const tool of getAllTools()) {
    const installed = isToolInstalled(tool.id) ? "installed" : "not found";
    logger.info(`    ${tool.name}: ${installed}`);
  }

  const syncState = loadSyncState();
  logger.info("\n  Sync state:");
  logger.info(`    Status: ${syncState.status}`);
  logger.info(`    Last attempt: ${formatMaybe(syncState.lastAttemptAt)}`);
  logger.info(`    Last success: ${formatMaybe(syncState.lastSuccessAt)}`);
  if (syncState.lastSource) {
    logger.info(`    Last source: ${syncState.lastSource}`);
  }
  if (syncState.lastError) {
    logger.info(`    Last error: ${syncState.lastError}`);
  }
  if (syncState.lastResult) {
    logger.info(
      `    Last result: ${syncState.lastResult.buckets} buckets, ${syncState.lastResult.sessions} sessions`,
    );
  }

  logger.info("");
}
