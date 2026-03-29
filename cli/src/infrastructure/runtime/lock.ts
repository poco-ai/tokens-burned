import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { ensureAppRuntimeDirs, getSyncLockPath } from "./paths";
import type { SyncSource } from "./state";

interface LockMetadata {
  createdAt: string;
  pid: number;
  source: SyncSource;
}

export interface SyncLock {
  release(): void;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code !== "ESRCH";
  }
}

function readLockMetadata(lockPath: string): LockMetadata | null {
  if (!existsSync(lockPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(lockPath, "utf-8")) as LockMetadata;
  } catch {
    return null;
  }
}

function removeStaleLock(lockPath: string): void {
  const metadata = readLockMetadata(lockPath);
  if (!metadata) {
    rmSync(lockPath, { force: true });
    return;
  }

  if (!isProcessAlive(metadata.pid)) {
    rmSync(lockPath, { force: true });
  }
}

export function tryAcquireSyncLock(source: SyncSource): SyncLock | null {
  ensureAppRuntimeDirs();
  const lockPath = getSyncLockPath();

  try {
    const fd = openSync(lockPath, "wx");
    const metadata: LockMetadata = {
      createdAt: new Date().toISOString(),
      pid: process.pid,
      source,
    };
    writeFileSync(fd, JSON.stringify(metadata, null, 2));
    closeSync(fd);

    return {
      release() {
        rmSync(lockPath, { force: true });
      },
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST") {
      throw error;
    }
  }

  removeStaleLock(lockPath);

  try {
    const fd = openSync(lockPath, "wx");
    const metadata: LockMetadata = {
      createdAt: new Date().toISOString(),
      pid: process.pid,
      source,
    };
    writeFileSync(fd, JSON.stringify(metadata, null, 2));
    closeSync(fd);

    return {
      release() {
        rmSync(lockPath, { force: true });
      },
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST") {
      return null;
    }
    throw error;
  }
}

export function describeExistingSyncLock(): string | null {
  const metadata = readLockMetadata(getSyncLockPath());
  if (!metadata) {
    return null;
  }

  return `pid=${metadata.pid}, source=${metadata.source}, createdAt=${metadata.createdAt}`;
}
