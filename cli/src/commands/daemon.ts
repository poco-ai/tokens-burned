import {
  DEFAULT_SYNC_INTERVAL,
  loadConfig,
} from "../infrastructure/config/manager";
import { formatBullet, formatHeader } from "../infrastructure/ui/format";
import {
  isInteractiveTerminal,
  promptConfirm,
} from "../infrastructure/ui/prompts";
import { runSync } from "../services/sync-service";
import { logger } from "../utils/logger";
import { runInit } from "./init";

function log(msg: string): void {
  const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
  process.stdout.write(`[${ts}] ${msg}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface DaemonOptions {
  interval?: number;
}

export async function runDaemon(opts: DaemonOptions = {}): Promise<void> {
  let config = loadConfig();
  if (!config?.apiKey) {
    if (isInteractiveTerminal()) {
      logger.info(
        formatHeader(
          "尚未完成初始化",
          "启动 daemon 前需要先配置有效的 API Key。",
        ),
      );
      const shouldInit = await promptConfirm({
        message: "是否先进入初始化流程？",
        defaultValue: true,
      });
      if (shouldInit) {
        await runInit({ daemon: false });
        config = loadConfig();
        if (!config?.apiKey) {
          logger.info(
            formatBullet("初始化未完成，已取消启动 daemon。", "warning"),
          );
          return;
        }
      } else {
        logger.info(formatBullet("已取消启动 daemon。", "warning"));
        return;
      }
    }
    if (!config?.apiKey) {
      logger.error("Not configured. Run `tokenarena init` first.");
      process.exit(1);
    }
  }

  const interval =
    opts.interval || config.syncInterval || DEFAULT_SYNC_INTERVAL;
  const intervalMin = Math.round(interval / 60000);

  log(`Daemon started (sync every ${intervalMin}m, Ctrl+C to stop)`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await runSync(config, {
        quiet: true,
        source: "daemon",
        throws: true,
      });
    } catch (err) {
      if ((err as Error).message === "UNAUTHORIZED") {
        log("API key invalid. Exiting.");
        process.exit(1);
      }
      log(`Sync error: ${(err as Error).message}`);
    }
    await sleep(interval);
  }
}
