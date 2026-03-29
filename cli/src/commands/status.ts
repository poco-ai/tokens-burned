import { existsSync } from "node:fs";
import { getConfigPath, loadConfig } from "../infrastructure/config/manager";
import { loadSyncState } from "../infrastructure/runtime/state";
import { getLaunchdStatus } from "../infrastructure/service/launchd";
import { loadServiceManifest } from "../infrastructure/service/manifest";
import { detectInstalledTools, getAllTools } from "../parsers/registry";
import { logger } from "../utils/logger";

export async function runStatus(): Promise<void> {
  const config = loadConfig();
  logger.info("\ntokens-burned status\n");

  if (!config?.apiKey) {
    logger.info("  Config: not configured");
    logger.info(`  Run \`tokens-burned init\` to set up.\n`);
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
    const installed = existsSync(tool.dataDir) ? "installed" : "not found";
    logger.info(`    ${tool.name}: ${installed}`);
  }

  const serviceManifest = loadServiceManifest();
  if (process.platform === "darwin" || serviceManifest) {
    const label = serviceManifest?.label;
    const launchd =
      process.platform === "darwin" ? getLaunchdStatus(label) : null;
    const syncState = loadSyncState();

    logger.info("\n  Background sync:");
    logger.info(
      `    Installed: ${launchd ? (launchd.installed ? "yes" : "no") : serviceManifest ? "yes" : "no"}`,
    );
    if (launchd) {
      logger.info(`    Loaded: ${launchd.loaded ? "yes" : "no"}`);
      logger.info(`    Label: ${launchd.label}`);
    }
    if (serviceManifest) {
      logger.info(
        `    Interval: ${Math.round(serviceManifest.intervalMs / 60000)}m`,
      );
      logger.info(`    Plist: ${serviceManifest.plistPath}`);
      logger.info(`    Logs: ${serviceManifest.logPath}`);
    }
    logger.info(`    Last sync status: ${syncState.status}`);
    if (syncState.lastSuccessAt) {
      logger.info(`    Last success: ${syncState.lastSuccessAt}`);
    }
    if (syncState.lastError) {
      logger.info(`    Last error: ${syncState.lastError}`);
    }
  }

  logger.info("");
}
