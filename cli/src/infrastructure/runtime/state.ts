import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ensureAppRuntimeDirs, getSyncStatePath } from "./paths";

export type SyncSource = "daemon" | "default" | "init" | "manual";

export type SyncStateStatus =
  | "auth_error"
  | "error"
  | "idle"
  | "skipped_locked"
  | "syncing";

export interface SyncState {
  pid?: number;
  lastAttemptAt?: string;
  lastCompletedAt?: string;
  lastError?: string;
  lastFailureAt?: string;
  lastResult?: {
    buckets: number;
    sessions: number;
  };
  lastSource?: SyncSource;
  lastSuccessAt?: string;
  status: SyncStateStatus;
}

function getDefaultState(): SyncState {
  return { status: "idle" };
}

export function loadSyncState(): SyncState {
  const path = getSyncStatePath();
  if (!existsSync(path)) {
    return getDefaultState();
  }

  try {
    return {
      ...getDefaultState(),
      ...(JSON.parse(readFileSync(path, "utf-8")) as Partial<SyncState>),
    };
  } catch {
    return getDefaultState();
  }
}

export function saveSyncState(next: SyncState): void {
  ensureAppRuntimeDirs();
  writeFileSync(
    getSyncStatePath(),
    `${JSON.stringify(next, null, 2)}\n`,
    "utf-8",
  );
}

export function markSyncStarted(source: SyncSource): void {
  const current = loadSyncState();
  saveSyncState({
    ...current,
    pid: process.pid,
    lastAttemptAt: new Date().toISOString(),
    lastSource: source,
    status: "syncing",
  });
}

export function markSyncSucceeded(
  source: SyncSource,
  result: { buckets: number; sessions: number },
): void {
  const now = new Date().toISOString();
  const current = loadSyncState();
  saveSyncState({
    ...current,
    lastCompletedAt: now,
    lastError: undefined,
    lastFailureAt: undefined,
    lastResult: result,
    lastSource: source,
    lastSuccessAt: now,
    pid: undefined,
    status: "idle",
  });
}

export function markSyncFailed(
  source: SyncSource,
  error: string,
  status: Extract<SyncStateStatus, "auth_error" | "error" | "skipped_locked">,
): void {
  const now = new Date().toISOString();
  const current = loadSyncState();
  saveSyncState({
    ...current,
    lastCompletedAt: now,
    lastError: error,
    lastFailureAt: now,
    lastSource: source,
    pid: undefined,
    status,
  });
}
