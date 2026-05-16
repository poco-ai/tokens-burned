import { loadConfig } from "../infrastructure/config/manager";
import { formatBullet, formatHeader } from "../infrastructure/ui/format";
import {
  isInteractiveTerminal,
  promptConfirm,
} from "../infrastructure/ui/prompts";
import { runSync } from "../services/sync-service";
import { logger } from "../utils/logger";
import { runInit } from "./init";

const DEFAULT_INTERVAL = 30 * 60_000; // 30 minutes

function log(msg: string): void {
  const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
  process.stdout.write(`[${ts}] ${msg}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface DaemonOptions {
  interval?: number;
  service?: boolean;
}

export function getDaemonExitCode(opts: DaemonOptions = {}): number {
  return opts.service ? 0 : 1;
}

export async function runDaemon(opts: DaemonOptions = {}): Promise<void> {
  const config = loadConfig();
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
        await runInit();
        return;
      }
      logger.info(formatBullet("已取消启动 daemon。", "warning"));
      return;
    }

    const message = opts.service
      ? "Not configured. Exiting service mode."
      : "Not configured. Run `tokenarena init` first.";
    logger.error(message);
    process.exit(getDaemonExitCode(opts));
  }

  const interval = opts.interval || config.syncInterval || DEFAULT_INTERVAL;
  const intervalMin = Math.round(interval / 60000);
  const stopHint = opts.service ? "service mode" : "Ctrl+C to stop";

  log(`Daemon started (sync every ${intervalMin}m, ${stopHint})`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const fresh = loadConfig();
      await runSync(fresh ?? config, {
        quiet: true,
        source: "daemon",
        throws: true,
      });
    } catch (err) {
      if ((err as Error).message === "UNAUTHORIZED") {
        const message = opts.service
          ? "API key invalid. Exiting service mode."
          : "API key invalid. Exiting.";
        log(message);
        process.exit(getDaemonExitCode(opts));
      }
      log(`Sync error: ${(err as Error).message}`);
    }
    await sleep(interval);
  }
}
