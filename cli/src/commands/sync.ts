import { loadConfig } from "../infrastructure/config/manager";
import { runSync } from "../services/sync-service";
import { logger } from "../utils/logger";

export interface SyncCommandOptions {
  quiet?: boolean;
  serviceMode?: boolean;
}

export async function runSyncCommand(
  opts: SyncCommandOptions = {},
): Promise<void> {
  const config = loadConfig();
  if (!config?.apiKey) {
    logger.error("Not configured. Run `tokens-burned init` first.");
    process.exit(1);
  }

  await runSync(config, {
    quiet: opts.quiet,
    serviceMode: opts.serviceMode,
    source: opts.serviceMode ? "service" : "manual",
  });
}
