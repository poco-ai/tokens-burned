import { existsSync } from "node:fs";
import { loadConfig, getConfigPath } from "../infrastructure/config/manager";
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
    logger.info(`  API URL: ${config.apiUrl || "https://vibecafe.ai"}`);
    if (config.syncInterval) {
      logger.info(`  Sync interval: ${Math.round(config.syncInterval / 60000)}m`);
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
  logger.info("");
}
