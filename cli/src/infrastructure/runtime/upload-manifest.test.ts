import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadManifest } from "../../domain/upload-manifest";

describe("runtime/upload-manifest", () => {
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

  function makeManifest(overrides?: Partial<UploadManifest>): UploadManifest {
    return {
      version: 1,
      scope: {
        apiUrl: "https://example.com",
        apiKeyHash: "hash123",
        deviceId: "dev1",
        projectMode: "hashed",
        projectHashSaltHash: "salthash",
        snapshotProtocolVersion: 0,
      },
      buckets: {},
      sessions: {},
      updatedAt: "2026-01-01T00:00:00Z",
      ...overrides,
    };
  }

  it("loadUploadManifest returns null when file does not exist", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-um-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { loadUploadManifest } = await import("./upload-manifest");
    expect(loadUploadManifest()).toBeNull();
  });

  it("loadUploadManifest reads valid manifest", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-um-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { saveUploadManifest, loadUploadManifest } = await import(
      "./upload-manifest"
    );
    const manifest = makeManifest();
    saveUploadManifest(manifest);
    const loaded = loadUploadManifest();
    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(1);
    expect(loaded?.scope.deviceId).toBe("dev1");
  });

  it("loadUploadManifest returns null on corrupt JSON", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-um-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { getUploadManifestPath } = await import("./paths");
    const manifestPath = getUploadManifestPath();
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(tmp, "tokenarena"), { recursive: true });
    writeFileSync(manifestPath, "corrupt");
    const { loadUploadManifest } = await import("./upload-manifest");
    expect(loadUploadManifest()).toBeNull();
  });

  it("loadUploadManifest returns null on schema mismatch", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-um-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { getUploadManifestPath } = await import("./paths");
    const manifestPath = getUploadManifestPath();
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(tmp, "tokenarena"), { recursive: true });
    writeFileSync(manifestPath, JSON.stringify({ version: 99 }));
    const { loadUploadManifest } = await import("./upload-manifest");
    expect(loadUploadManifest()).toBeNull();
  });

  it("loadUploadManifest returns null when scope is missing fields", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-um-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { getUploadManifestPath } = await import("./paths");
    const manifestPath = getUploadManifestPath();
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(tmp, "tokenarena"), { recursive: true });
    writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 1,
        scope: { apiUrl: "only" },
        buckets: {},
        sessions: {},
        updatedAt: "2026-01-01T00:00:00Z",
      }),
    );
    const { loadUploadManifest } = await import("./upload-manifest");
    expect(loadUploadManifest()).toBeNull();
  });

  it("loadUploadManifest returns null when buckets is not Record<string,string>", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-um-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { getUploadManifestPath } = await import("./paths");
    const manifestPath = getUploadManifestPath();
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(tmp, "tokenarena"), { recursive: true });
    writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 1,
        scope: {
          apiUrl: "https://example.com",
          apiKeyHash: "h",
          deviceId: "d",
          projectMode: "hashed",
          projectHashSaltHash: "s",
        },
        buckets: [1, 2, 3],
        sessions: {},
        updatedAt: "2026-01-01T00:00:00Z",
      }),
    );
    const { loadUploadManifest } = await import("./upload-manifest");
    expect(loadUploadManifest()).toBeNull();
  });

  it("saveUploadManifest and loadUploadManifest round-trip", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-um-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { saveUploadManifest, loadUploadManifest } = await import(
      "./upload-manifest"
    );
    const manifest = makeManifest({
      buckets: { key1: "hash1" },
      sessions: { s1: "sh1" },
    });
    saveUploadManifest(manifest);
    const loaded = loadUploadManifest();
    expect(loaded?.buckets).toEqual({ key1: "hash1" });
    expect(loaded?.sessions).toEqual({ s1: "sh1" });
  });

  it("defaults snapshotProtocolVersion to 0 when missing", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ta-um-"));
    createdDirs.push(tmp);
    process.env.XDG_STATE_HOME = tmp;
    process.env.XDG_RUNTIME_DIR = tmp;
    const { getUploadManifestPath } = await import("./paths");
    const manifestPath = getUploadManifestPath();
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(tmp, "tokenarena"), { recursive: true });
    writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 1,
        scope: {
          apiUrl: "https://example.com",
          apiKeyHash: "h",
          deviceId: "d",
          projectMode: "hashed",
          projectHashSaltHash: "s",
        },
        buckets: {},
        sessions: {},
        updatedAt: "2026-01-01T00:00:00Z",
      }),
    );
    const { loadUploadManifest } = await import("./upload-manifest");
    const loaded = loadUploadManifest();
    expect(loaded).not.toBeNull();
    expect(loaded?.scope.snapshotProtocolVersion).toBe(0);
  });
});
