import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("runtime/state", () => {
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

  async function importState() {
    return await import("./state");
  }

  it("loadSyncState returns default when no file exists", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-state-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { loadSyncState } = await importState();
    expect(loadSyncState()).toEqual({ status: "idle" });
  });

  it("loadSyncState reads valid JSON", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-state-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { saveSyncState, loadSyncState } = await importState();
    saveSyncState({ status: "syncing", pid: 123 });
    const state = loadSyncState();
    expect(state.status).toBe("syncing");
    expect(state.pid).toBe(123);
  });

  it("loadSyncState returns default on corrupt JSON", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-state-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { getSyncStatePath } = await import("./paths");
    const { writeFileSync, mkdirSync } = await import("node:fs");
    mkdirSync(join(tmp, "tokenarena"), { recursive: true });
    writeFileSync(getSyncStatePath(), "bad json{{");
    const { loadSyncState } = await importState();
    expect(loadSyncState()).toEqual({ status: "idle" });
  });

  it("saveSyncState writes readable JSON", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-state-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { saveSyncState, loadSyncState } = await importState();
    saveSyncState({ status: "idle", lastSuccessAt: "2026-01-01T00:00:00Z" });
    const state = loadSyncState();
    expect(state.lastSuccessAt).toBe("2026-01-01T00:00:00Z");
  });

  it("markSyncStarted sets syncing status", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-state-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { markSyncStarted, loadSyncState } = await importState();
    markSyncStarted("manual");
    const state = loadSyncState();
    expect(state.status).toBe("syncing");
    expect(state.pid).toBe(process.pid);
    expect(state.lastSource).toBe("manual");
    expect(state.lastAttemptAt).toBeTruthy();
  });

  it("markSyncSucceeded sets idle and clears lastError", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-state-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { markSyncFailed, markSyncSucceeded, loadSyncState } =
      await importState();
    markSyncFailed("manual", "some error", "error");
    markSyncSucceeded("manual", { buckets: 5, sessions: 2 });
    const state = loadSyncState();
    expect(state.status).toBe("idle");
    expect(state.lastError).toBeUndefined();
    expect(state.lastResult).toEqual({ buckets: 5, sessions: 2 });
    expect(state.lastSuccessAt).toBeTruthy();
    expect(state.pid).toBeUndefined();
  });

  it("markSyncFailed sets error status", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-state-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { markSyncFailed, loadSyncState } = await importState();
    markSyncFailed("daemon", "connection timeout", "error");
    const state = loadSyncState();
    expect(state.status).toBe("error");
    expect(state.lastError).toBe("connection timeout");
    expect(state.lastSource).toBe("daemon");
    expect(state.lastFailureAt).toBeTruthy();
  });

  it("markSyncFailed with auth_error status", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-state-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { markSyncFailed, loadSyncState } = await importState();
    markSyncFailed("manual", "bad key", "auth_error");
    const state = loadSyncState();
    expect(state.status).toBe("auth_error");
  });
});
