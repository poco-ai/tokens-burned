import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("runtime/lock", () => {
  const originalStateHome = process.env.XDG_STATE_HOME;
  const originalRuntimeDir = process.env.XDG_RUNTIME_DIR;
  const createdDirs: string[] = [];

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalStateHome !== undefined) {
      process.env.XDG_STATE_HOME = originalStateHome;
    } else {
      delete process.env.XDG_STATE_HOME;
    }
    if (originalRuntimeDir !== undefined) {
      process.env.XDG_RUNTIME_DIR = originalRuntimeDir;
    } else {
      delete process.env.XDG_RUNTIME_DIR;
    }
    for (const dir of createdDirs.splice(0)) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  async function importLock() {
    return await import("./lock");
  }

  it("tryAcquireSyncLock succeeds on first call", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-lock-"));
    createdDirs.push(tmp);
    process.env.XDG_RUNTIME_DIR = tmp;
    process.env.XDG_STATE_HOME = tmp;
    const { tryAcquireSyncLock } = await importLock();
    const lock = tryAcquireSyncLock("manual");
    expect(lock).not.toBeNull();
    lock?.release();
  });

  it("lock can be re-acquired after release", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-lock-"));
    createdDirs.push(tmp);
    process.env.XDG_RUNTIME_DIR = tmp;
    process.env.XDG_STATE_HOME = tmp;
    const { tryAcquireSyncLock } = await importLock();
    const lock1 = tryAcquireSyncLock("manual");
    expect(lock1).not.toBeNull();
    lock1?.release();
    const lock2 = tryAcquireSyncLock("daemon");
    expect(lock2).not.toBeNull();
    lock2?.release();
  });

  it("second acquisition returns null when locked", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-lock-"));
    createdDirs.push(tmp);
    process.env.XDG_RUNTIME_DIR = tmp;
    process.env.XDG_STATE_HOME = tmp;
    const { tryAcquireSyncLock } = await importLock();
    const lock1 = tryAcquireSyncLock("manual");
    expect(lock1).not.toBeNull();
    const lock2 = tryAcquireSyncLock("daemon");
    expect(lock2).toBeNull();
    lock1?.release();
  });

  it("describeExistingSyncLock returns null when no lock", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-lock-"));
    createdDirs.push(tmp);
    process.env.XDG_RUNTIME_DIR = tmp;
    process.env.XDG_STATE_HOME = tmp;
    const { describeExistingSyncLock } = await importLock();
    expect(describeExistingSyncLock()).toBeNull();
  });

  it("describeExistingSyncLock returns description when locked", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-lock-"));
    createdDirs.push(tmp);
    process.env.XDG_RUNTIME_DIR = tmp;
    process.env.XDG_STATE_HOME = tmp;
    const { tryAcquireSyncLock, describeExistingSyncLock } = await importLock();
    const lock = tryAcquireSyncLock("manual");
    expect(lock).not.toBeNull();
    const desc = describeExistingSyncLock();
    expect(desc).not.toBeNull();
    expect(desc).toContain(`pid=${process.pid}`);
    expect(desc).toContain("source=manual");
    lock?.release();
  });

  it("releases stale lock from dead process", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-lock-"));
    createdDirs.push(tmp);
    process.env.XDG_RUNTIME_DIR = tmp;
    process.env.XDG_STATE_HOME = tmp;
    // Create a lock file with a PID that doesn't exist
    const { getSyncLockPath } = await import("./paths");
    const lockPath = getSyncLockPath();
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(tmp, "tokenarena"), { recursive: true });
    writeFileSync(
      lockPath,
      JSON.stringify({
        createdAt: new Date().toISOString(),
        pid: 999999999,
        source: "manual",
      }),
    );
    const { tryAcquireSyncLock } = await importLock();
    const lock = tryAcquireSyncLock("daemon");
    // Should succeed because the stale lock should be cleaned up
    expect(lock).not.toBeNull();
    lock?.release();
  });
});
