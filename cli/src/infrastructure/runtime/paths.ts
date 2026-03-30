import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { getConfigDir } from "../config/manager";

export function getRuntimeDir(): string {
  return join(getConfigDir(), "runtime");
}

export function getSyncLockPath(): string {
  return join(getRuntimeDir(), "sync.lock");
}

export function getSyncStatePath(): string {
  return join(getRuntimeDir(), "status.json");
}

export function ensureAppRuntimeDirs(): void {
  mkdirSync(getRuntimeDir(), { recursive: true });
}
