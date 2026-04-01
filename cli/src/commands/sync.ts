import { loadConfig } from "../infrastructure/config/manager";
import { formatBullet, formatHeader } from "../infrastructure/ui/format";
import {
  isInteractiveTerminal,
  promptConfirm,
} from "../infrastructure/ui/prompts";
import { runSync } from "../services/sync-service";
import { logger } from "../utils/logger";
import { runInit } from "./init";

export interface SyncCommandOptions {
  quiet?: boolean;
}

export async function runSyncCommand(
  opts: SyncCommandOptions = {},
): Promise<void> {
  let config = loadConfig();
  if (!config?.apiKey) {
    if (isInteractiveTerminal()) {
      logger.info(
        formatHeader("尚未完成初始化", "同步前需要先配置有效的 API Key。"),
      );
      const shouldInit = await promptConfirm({
        message: "是否现在进入初始化流程？",
        defaultValue: true,
      });
      if (shouldInit) {
        await runInit({ daemon: false });
        config = loadConfig();
        if (!config?.apiKey) {
          logger.info(formatBullet("初始化未完成，已取消同步。", "warning"));
          return;
        }
      } else {
        logger.info(formatBullet("已取消同步。", "warning"));
        return;
      }
    }
    if (!config?.apiKey) {
      logger.error("Not configured. Run `tokenarena init` first.");
      process.exit(1);
    }
  }

  await runSync(config, {
    quiet: opts.quiet,
    source: "manual",
  });
}
