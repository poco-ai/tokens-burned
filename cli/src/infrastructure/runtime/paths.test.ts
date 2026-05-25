import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

describe("paths", () => {
  const originalStateHome = process.env.XDG_STATE_HOME;
  const originalRuntimeDir = process.env.XDG_RUNTIME_DIR;
  const createdDirs: string[] = [];

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

  async function importPaths() {
    const mod = await import("./paths");
    return mod;
  }

  it("getRuntimeDirPath joins runtime dir with tokenarena", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-paths-"));
    createdDirs.push(tmp);
    process.env.XDG_RUNTIME_DIR = tmp;
    const { getRuntimeDirPath } = await importPaths();
    expect(getRuntimeDirPath()).toBe(join(tmp, "tokenarena"));
  });

  it("getStateDir joins state home with tokenarena", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-paths-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    const { getStateDir } = await importPaths();
    expect(getStateDir()).toBe(join(tmp, "tokenarena"));
  });

  it("getSyncLockPath returns path under runtime dir", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-paths-"));
    createdDirs.push(tmp);
    process.env.XDG_RUNTIME_DIR = tmp;
    const { getSyncLockPath } = await importPaths();
    expect(getSyncLockPath()).toBe(join(tmp, "tokenarena", "sync.lock"));
  });

  it("getSyncStatePath returns path under state dir", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-paths-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    const { getSyncStatePath } = await importPaths();
    expect(getSyncStatePath()).toBe(join(tmp, "tokenarena", "status.json"));
  });

  it("getUploadManifestPath returns path under state dir", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-paths-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    const { getUploadManifestPath } = await importPaths();
    expect(getUploadManifestPath()).toBe(
      join(tmp, "tokenarena", "upload-manifest.json"),
    );
  });

  it("ensureAppDirs creates directories", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-paths-"));
    createdDirs.push(tmp);
    process.env.XDG_RUNTIME_DIR = tmp;
    process.env.XDG_STATE_HOME = tmp;
    const { ensureAppDirs } = await importPaths();
    ensureAppDirs();
    expect(existsSync(join(tmp, "tokenarena"))).toBe(true);
  });
});
