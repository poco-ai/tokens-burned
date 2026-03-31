import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { getRuntimeDir, getStateHome } from "../xdg";

const APP_NAME = "tokenarena";

export function getConfigDir(): string {
  // Re-exported from manager for backward compat — callers should import from manager directly
  throw new Error("Use getConfigDir() from config/manager instead");
}

export function getRuntimeDirPath(): string {
  return join(getRuntimeDir(), APP_NAME);
}

export function getStateDir(): string {
  return join(getStateHome(), APP_NAME);
}

export function getSyncLockPath(): string {
  return join(getRuntimeDirPath(), "sync.lock");
}

export function getSyncStatePath(): string {
  return join(getStateDir(), "status.json");
}

export function getUploadManifestPath(): string {
  return join(getStateDir(), "upload-manifest.json");
}

export function ensureAppDirs(): void {
  mkdirSync(getRuntimeDirPath(), { recursive: true });
  mkdirSync(getStateDir(), { recursive: true });
}
