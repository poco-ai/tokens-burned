import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { getConfigHome } from "../xdg";

export interface Config {
  apiKey: string;
  apiUrl: string;
  deviceId?: string;
  syncInterval?: number;
  logLevel?: "debug" | "info" | "warn" | "error";
}

const CONFIG_DIR = join(getConfigHome(), "tokenarena");
const isDev = process.env.TOKEN_ARENA_DEV === "1";
const CONFIG_FILE = join(CONFIG_DIR, isDev ? "config.dev.json" : "config.json");

const DEFAULT_API_URL = "https://token.poco-ai.com";
// export const DEFAULT_SYNC_INTERVAL = 2 * 60 * 60_000;
export const DEFAULT_SYNC_INTERVAL = 60 * 1000; // 5 minutes
const VALID_CONFIG_KEYS = [
  "apiKey",
  "apiUrl",
  "deviceId",
  "syncInterval",
  "logLevel",
];

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function loadConfig(): Config | null {
  if (!existsSync(CONFIG_FILE)) return null;
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    const config = JSON.parse(raw) as Config;
    // Ensure apiUrl has a default
    if (!config.apiUrl) {
      config.apiUrl = DEFAULT_API_URL;
    }
    return config;
  } catch {
    return null;
  }
}

export function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}

export function deleteConfig(): void {
  if (existsSync(CONFIG_FILE)) {
    unlinkSync(CONFIG_FILE);
  }
}

export function getOrCreateDeviceId(config: Config): string {
  if (config.deviceId) return config.deviceId;

  const next = randomUUID();
  saveConfig({ ...config, deviceId: next });

  return next;
}

export function validateApiKey(key: string): boolean {
  return key.startsWith("ta_");
}

export function isValidConfigKey(key: string): boolean {
  return VALID_CONFIG_KEYS.includes(key);
}

export function getDefaultApiUrl(): string {
  return process.env.TOKEN_ARENA_API_URL || DEFAULT_API_URL;
}
