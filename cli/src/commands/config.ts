import { loadConfig, saveConfig, isValidConfigKey } from "../infrastructure/config/manager";
import { logger } from "../utils/logger";

const VALID_KEYS = ["apiKey", "apiUrl", "syncInterval", "logLevel"];

export function handleConfig(args: string[]): void {
  const sub = args[0];

  switch (sub) {
    case "get": {
      const key = args[1];
      if (!key) {
        logger.error("Usage: tokens-burned config get <key>");
        process.exit(1);
      }
      const config = loadConfig();
      if (!config || !(key in config)) {
        // Output nothing — caller checks exit code or empty output
        process.exit(0);
      }
      // Output raw value (no formatting) for machine parsing
      console.log((config as Record<string, unknown>)[key] ?? "");
      break;
    }
    case "set": {
      const key = args[1];
      let value: string | number = args[2];
      if (!key || value === undefined) {
        logger.error("Usage: tokens-burned config set <key> <value>");
        process.exit(1);
      }
      if (!VALID_KEYS.includes(key)) {
        logger.error(`Unknown config key: ${key}`);
        logger.error(`Valid keys: ${VALID_KEYS.join(", ")}`);
        process.exit(1);
      }
      const config = loadConfig() || { apiKey: "", apiUrl: "https://vibecafe.ai" };

      // Type conversion for numeric values
      if (key === "syncInterval") {
        value = parseInt(value, 10);
        if (isNaN(value)) {
          logger.error("syncInterval must be a number (milliseconds)");
          process.exit(1);
        }
      }

      (config as Record<string, unknown>)[key] = value;
      saveConfig(config);
      logger.info(`Set ${key} = ${value}`);
      break;
    }
    case "show": {
      const config = loadConfig();
      if (!config) {
        console.log("{}");
      } else {
        console.log(JSON.stringify(config, null, 2));
      }
      break;
    }
    default:
      logger.error(`Unknown config subcommand: ${sub || "(none)"}`);
      logger.error("Usage: tokens-burned config <get|set|show>");
      process.exit(1);
  }
}
