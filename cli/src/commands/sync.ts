import { loadConfig } from "../infrastructure/config/manager";
import { runSync } from "../services/sync-service";
import { logger } from "../utils/logger";

export async function runSyncCommand(): Promise<void> {
  const config = loadConfig();
  if (!config?.apiKey) {
    logger.error('Not configured. Run `tokens-burned init` first.');
    process.exit(1);
  }

  await runSync(config);
}
