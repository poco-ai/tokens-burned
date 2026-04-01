import {
  DEFAULT_SYNC_INTERVAL,
  getConfigPath,
  loadConfig,
} from "../infrastructure/config/manager";
import { loadSyncState } from "../infrastructure/runtime/state";
import {
  formatBullet,
  formatHeader,
  formatKeyValue,
  formatSection,
  formatStatusBadge,
  maskSecret,
} from "../infrastructure/ui/format";
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
  logger.info(
    formatHeader(
      "TokenArena 状态",
      "查看当前配置、已检测工具以及最近一次同步情况。",
    ),
  );

  logger.info(formatSection("配置"));
  if (!config?.apiKey) {
    logger.info(formatKeyValue("状态", formatStatusBadge("未配置", "warning")));
    logger.info(formatBullet("运行 tokenarena init 完成首次设置。", "warning"));
  } else {
    logger.info(formatKeyValue("状态", formatStatusBadge("已配置", "success")));
    logger.info(formatKeyValue("配置文件", getConfigPath()));
    logger.info(formatKeyValue("API Key", maskSecret(config.apiKey)));
    logger.info(
      formatKeyValue("API URL", config.apiUrl || "https://token.poco-ai.com"),
    );
    logger.info(
      formatKeyValue(
        "同步间隔",
        `${Math.round((config.syncInterval ?? DEFAULT_SYNC_INTERVAL) / 60000)} 分钟`,
      ),
    );
  }

  logger.info(formatSection("已检测工具"));
  const detected = detectInstalledTools();
  if (detected.length === 0) {
    logger.info(formatBullet("未检测到已安装的 AI CLI。", "warning"));
  } else {
    for (const tool of detected) {
      logger.info(formatBullet(tool.name, "success"));
    }
  }

  logger.info(formatSection("支持的工具"));
  for (const tool of getAllTools()) {
    const installed = isToolInstalled(tool.id);
    logger.info(
      formatBullet(
        `${tool.name} · ${installed ? "已安装" : "未发现"}`,
        installed ? "success" : "neutral",
      ),
    );
  }

  const syncState = loadSyncState();
  logger.info(formatSection("同步状态"));
  const statusTone =
    syncState.status === "idle"
      ? "success"
      : syncState.status === "syncing"
        ? "warning"
        : "danger";
  logger.info(
    formatKeyValue("状态", formatStatusBadge(syncState.status, statusTone)),
  );
  logger.info(formatKeyValue("上次尝试", formatMaybe(syncState.lastAttemptAt)));
  logger.info(formatKeyValue("上次成功", formatMaybe(syncState.lastSuccessAt)));
  if (syncState.lastSource) {
    logger.info(formatKeyValue("触发来源", syncState.lastSource));
  }
  if (syncState.lastError) {
    logger.info(formatKeyValue("错误信息", syncState.lastError));
  }
  if (syncState.lastResult) {
    logger.info(
      formatKeyValue(
        "最近结果",
        `${syncState.lastResult.buckets} buckets, ${syncState.lastResult.sessions} sessions`,
      ),
    );
  }
}
