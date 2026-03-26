import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface Config {
  apiKey: string;
  apiUrl: string;
  deviceId?: string;
  syncInterval?: number;
  logLevel?: "debug" | "info" | "warn" | "error";
}

const CONFIG_DIR = join(homedir(), ".tokens-burned");
const isDev = process.env.TOKENS_BURNED_DEV === "1";
const CONFIG_FILE = join(CONFIG_DIR, isDev ? "config.dev.json" : "config.json");

const DEFAULT_API_URL = "http://localhost:3000";
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
    const { unlinkSync } = require("node:fs");
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
  return key.startsWith("vbu_");
}

export function isValidConfigKey(key: string): boolean {
  return VALID_CONFIG_KEYS.includes(key);
}

export function getDefaultApiUrl(): string {
  return process.env.TOKENS_BURNED_API_URL || DEFAULT_API_URL;
}
