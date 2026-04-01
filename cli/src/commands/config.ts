import {
  DEFAULT_SYNC_INTERVAL,
  getDefaultApiUrl,
  isValidConfigKey,
  loadConfig,
  saveConfig,
  validateApiKey,
} from "../infrastructure/config/manager";
import {
  formatBullet,
  formatHeader,
  formatKeyValue,
  formatSection,
  maskSecret,
} from "../infrastructure/ui/format";
import {
  isInteractiveTerminal,
  promptPassword,
  promptSelect,
  promptText,
} from "../infrastructure/ui/prompts";
import { logger } from "../utils/logger";

const VALID_KEYS = ["apiKey", "apiUrl", "syncInterval", "logLevel"] as const;

type ConfigKey = (typeof VALID_KEYS)[number];
type ConfigSubcommand = "get" | "set" | "show";

function isConfigKey(value: string): value is ConfigKey {
  return isValidConfigKey(value) && VALID_KEYS.includes(value as ConfigKey);
}

function formatConfigValue(key: ConfigKey, value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "(empty)";
  }

  if (key === "apiKey") {
    return maskSecret(String(value));
  }

  if (key === "syncInterval") {
    const ms = Number(value);
    const minutes = Math.round(ms / 60000);
    return `${minutes} 分钟 (${ms} ms)`;
  }

  return String(value);
}

async function promptConfigSubcommand(): Promise<ConfigSubcommand> {
  logger.info(
    formatHeader("配置中心", "通过交互式菜单查看或修改 TokenArena CLI 配置。"),
  );

  return promptSelect<ConfigSubcommand>({
    message: "请选择配置操作",
    choices: [
      {
        name: "查看完整配置",
        value: "show",
        description: "以更适合阅读的方式展示当前配置",
      },
      {
        name: "读取单个配置项",
        value: "get",
        description: "查看某个配置键当前保存的值",
      },
      {
        name: "修改配置项",
        value: "set",
        description: "更新 API Key、API 地址、同步间隔或日志级别",
      },
    ],
  });
}

async function promptConfigKey(message: string): Promise<ConfigKey> {
  return promptSelect<ConfigKey>({
    message,
    choices: [
      {
        name: "apiKey",
        value: "apiKey",
        description: "上传数据时使用的 CLI API Key",
      },
      {
        name: "apiUrl",
        value: "apiUrl",
        description: "TokenArena 服务端地址",
      },
      {
        name: "syncInterval",
        value: "syncInterval",
        description: "daemon 默认同步间隔（毫秒）",
      },
      {
        name: "logLevel",
        value: "logLevel",
        description: "CLI 日志级别",
      },
    ],
  });
}

async function promptSyncIntervalValue(
  existingValue?: number,
): Promise<string> {
  const preset = await promptSelect<string>({
    message: "请选择默认同步间隔",
    choices: [
      {
        name: "120 分钟（2 小时）",
        value: String(DEFAULT_SYNC_INTERVAL),
        description: "默认值，适合低打扰后台同步",
      },
      {
        name: "10 分钟",
        value: String(10 * 60_000),
        description: "更省电，仍保持较及时同步",
      },
      {
        name: "30 分钟",
        value: String(30 * 60_000),
        description: "适合低频使用场景",
      },
      {
        name: "60 分钟",
        value: String(60 * 60_000),
        description: "长周期后台同步",
      },
      {
        name: "5 分钟",
        value: String(5 * 60_000),
        description: "更频繁同步，适合调试或高活跃场景",
      },
      {
        name: "自定义（毫秒）",
        value: "custom",
        description: "输入任意正整数毫秒值",
      },
    ],
  });

  if (preset !== "custom") {
    return preset;
  }

  return promptText({
    message: "请输入 syncInterval（毫秒）",
    defaultValue: existingValue ? String(existingValue) : undefined,
    validate: (value) => {
      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        return "请输入大于 0 的毫秒数，例如 300000。";
      }
      return true;
    },
  });
}

async function promptConfigValue(
  key: ConfigKey,
  existingValue?: unknown,
): Promise<string> {
  switch (key) {
    case "apiKey":
      return promptPassword({
        message: "请输入新的 CLI API Key",
        validate: (value) =>
          validateApiKey(value) || 'API Key 必须以 "ta_" 开头。',
      });
    case "apiUrl":
      return promptText({
        message: "请输入 API 服务地址",
        defaultValue:
          typeof existingValue === "string" && existingValue.length > 0
            ? existingValue
            : getDefaultApiUrl(),
        validate: (value) => {
          try {
            const url = new URL(value);
            return Boolean(url.protocol && url.host) || "请输入合法 URL。";
          } catch {
            return "请输入合法 URL。";
          }
        },
      });
    case "syncInterval":
      return promptSyncIntervalValue(
        typeof existingValue === "number" ? existingValue : undefined,
      );
    case "logLevel":
      return promptSelect<string>({
        message: "请选择日志级别",
        choices: [
          {
            name: "info",
            value: "info",
            description: "默认，输出常规进度与提示",
          },
          {
            name: "warn",
            value: "warn",
            description: "仅输出警告与错误",
          },
          {
            name: "error",
            value: "error",
            description: "只输出错误",
          },
          {
            name: "debug",
            value: "debug",
            description: "输出更详细的调试日志",
          },
        ],
      });
  }
}

function printConfigShow(): void {
  const config = loadConfig();

  if (!config) {
    logger.info(formatHeader("当前配置", "尚未创建本地配置文件。"));
    logger.info(formatBullet("运行 tokenarena init 完成首次配置。", "warning"));
    return;
  }

  logger.info(formatHeader("当前配置"));
  logger.info(formatSection("基础配置"));
  logger.info(formatKeyValue("API Key", maskSecret(config.apiKey || "")));
  logger.info(
    formatKeyValue("API 地址", config.apiUrl || "https://token.poco-ai.com"),
  );
  logger.info(
    formatKeyValue(
      "同步间隔",
      config.syncInterval
        ? `${Math.round(config.syncInterval / 60000)} 分钟 (${config.syncInterval} ms)`
        : `未设置（daemon 默认 ${Math.round(DEFAULT_SYNC_INTERVAL / 60000)} 分钟）`,
    ),
  );
  logger.info(formatKeyValue("日志级别", config.logLevel || "info"));
  if (config.deviceId) {
    logger.info(formatKeyValue("设备 ID", maskSecret(config.deviceId, 12)));
  }
}

export async function handleConfig(args: string[]): Promise<void> {
  const interactive = isInteractiveTerminal();
  let sub = args[0] as ConfigSubcommand | undefined;

  if (!sub) {
    if (!interactive) {
      logger.error("Usage: tokenarena config <get|set|show>");
      process.exit(1);
    }
    sub = await promptConfigSubcommand();
  }

  switch (sub) {
    case "get": {
      let key = args[1];
      if (!key) {
        if (!interactive) {
          logger.error("Usage: tokenarena config get <key>");
          process.exit(1);
        }
        key = await promptConfigKey("请选择要读取的配置项");
      }

      if (!isConfigKey(key)) {
        logger.error(`Unknown config key: ${key}`);
        logger.error(`Valid keys: ${VALID_KEYS.join(", ")}`);
        process.exit(1);
      }

      const config = loadConfig();
      if (!config || !(key in config)) {
        process.exit(0);
      }

      const record = config as unknown as Record<string, unknown>;
      console.log(record[key] ?? "");
      break;
    }
    case "set": {
      let key = args[1];
      if (!key) {
        if (!interactive) {
          logger.error("Usage: tokenarena config set <key> <value>");
          process.exit(1);
        }
        key = await promptConfigKey("请选择要修改的配置项");
      }

      if (!isConfigKey(key)) {
        logger.error(`Unknown config key: ${key}`);
        logger.error(`Valid keys: ${VALID_KEYS.join(", ")}`);
        process.exit(1);
      }

      const config = loadConfig() || {
        apiKey: "",
        apiUrl: getDefaultApiUrl(),
      };
      const record = config as unknown as Record<string, unknown>;

      let value = args[2];
      if (value === undefined) {
        if (!interactive) {
          logger.error("Usage: tokenarena config set <key> <value>");
          process.exit(1);
        }
        value = await promptConfigValue(key, record[key]);
      }

      let normalized: string | number = value;
      if (key === "apiKey" && !validateApiKey(value)) {
        logger.error('API Key must start with "ta_"');
        process.exit(1);
      }

      if (key === "apiUrl") {
        try {
          const url = new URL(value);
          normalized = url.toString().replace(/\/$/, "");
        } catch {
          logger.error("apiUrl must be a valid URL");
          process.exit(1);
        }
      }

      if (key === "syncInterval") {
        normalized = Number.parseInt(value, 10);
        if (Number.isNaN(normalized) || normalized <= 0) {
          logger.error("syncInterval must be a positive number (milliseconds)");
          process.exit(1);
        }
      }

      record[key] = normalized;
      saveConfig(config);

      if (interactive) {
        logger.info(formatHeader("配置已更新"));
        logger.info(formatKeyValue(key, formatConfigValue(key, normalized)));
      } else {
        logger.info(`Set ${key} = ${normalized}`);
      }
      break;
    }
    case "show": {
      if (interactive) {
        printConfigShow();
      } else {
        const config = loadConfig();
        console.log(config ? JSON.stringify(config, null, 2) : "{}");
      }
      break;
    }
    default:
      logger.error(`Unknown config subcommand: ${sub || "(none)"}`);
      logger.error("Usage: tokenarena config <get|set|show>");
      process.exit(1);
  }
}
