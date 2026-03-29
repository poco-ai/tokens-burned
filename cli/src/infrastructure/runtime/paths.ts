import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { getConfigDir } from "../config/manager";

export function getRuntimeDir(): string {
  return join(getConfigDir(), "runtime");
}

export function getServiceDir(): string {
  return join(getConfigDir(), "service");
}

export function getBinDir(): string {
  return join(getConfigDir(), "bin");
}

export function getLogDir(): string {
  return join(getConfigDir(), "logs");
}

export function getSyncLockPath(): string {
  return join(getRuntimeDir(), "sync.lock");
}

export function getSyncStatePath(): string {
  return join(getRuntimeDir(), "status.json");
}

export function getServiceManifestPath(): string {
  return join(getServiceDir(), "manifest.json");
}

export function getServiceLogPath(): string {
  return join(getLogDir(), "service.log");
}

export function getServiceWrapperPath(): string {
  return join(getBinDir(), "run-sync-service.sh");
}

export function ensureAppRuntimeDirs(): void {
  mkdirSync(getRuntimeDir(), { recursive: true });
  mkdirSync(getServiceDir(), { recursive: true });
  mkdirSync(getBinDir(), { recursive: true });
  mkdirSync(getLogDir(), { recursive: true });
}
