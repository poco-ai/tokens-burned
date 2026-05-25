import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { OpenCodeParser } from "./opencode";

describe("OpenCodeParser", () => {
  const originalOpenCodeDir = process.env.TOKEN_ARENA_OPENCODE_DIR;
  const createdDirs: string[] = [];

  afterEach(() => {
    process.env.TOKEN_ARENA_OPENCODE_DIR = originalOpenCodeDir;

    for (const dir of createdDirs.splice(0)) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it("ignores malformed negative token usage entries from json storage", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "tokenarena-opencode-"));
    createdDirs.push(rootDir);

    const sessionDir = join(rootDir, "storage", "message", "ses_1");
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      join(sessionDir, "msg-1.json"),
      JSON.stringify({
        created: "2026-01-12T14:49:26.154Z",
        modelID: "gemini-claude-opus-4-5-thinking",
        path: {
          root: "E:\\Users\\User\\Desktop\\ParticleSaturn",
        },
        role: "assistant",
        time: {
          created: "2026-01-12T14:49:26.154Z",
        },
        tokens: {
          input: -9053,
          output: 70,
          reasoning: 0,
          cache: {
            read: 12068,
          },
        },
      }),
      "utf-8",
    );
    writeFileSync(
      join(sessionDir, "msg-0.json"),
      JSON.stringify({
        created: "2026-01-12T14:49:26.140Z",
        role: "user",
        time: {
          created: "2026-01-12T14:49:26.140Z",
        },
      }),
      "utf-8",
    );

    const parser = new OpenCodeParser(() => [rootDir]);
    const result = await parser.parse();

    expect(result.buckets).toEqual([]);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toMatchObject({
      source: "opencode",
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      primaryModel: "",
      modelUsages: [],
    });
  });

  it("parses valid assistant messages from json storage", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "tokenarena-opencode-"));
    createdDirs.push(rootDir);

    const sessionDir = join(rootDir, "storage", "message", "ses_2");
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      join(sessionDir, "msg-0.json"),
      JSON.stringify({
        role: "user",
        time: { created: "2026-01-15T10:00:00.000Z" },
      }),
      "utf-8",
    );
    writeFileSync(
      join(sessionDir, "msg-1.json"),
      JSON.stringify({
        role: "assistant",
        modelID: "gpt-4",
        time: { created: "2026-01-15T10:00:01.000Z" },
        tokens: { input: 200, output: 100, reasoning: 20, cache: { read: 30 } },
        path: { root: "/home/user/my-project" },
      }),
      "utf-8",
    );

    const parser = new OpenCodeParser(() => [rootDir]);
    const result = await parser.parse();

    expect(result.buckets.length).toBeGreaterThan(0);
    expect(result.buckets[0].inputTokens).toBe(200);
    expect(result.buckets[0].outputTokens).toBe(100);
    expect(result.buckets[0].reasoningTokens).toBe(20);
    expect(result.buckets[0].cachedTokens).toBe(30);
    expect(result.sessions.length).toBeGreaterThan(0);
  });

  it("returns empty when directory does not exist", async () => {
    const parser = new OpenCodeParser(() => ["/nonexistent/path"]);
    const result = await parser.parse();
    expect(result.buckets).toEqual([]);
    expect(result.sessions).toEqual([]);
  });

  it("skips messages without valid timestamps", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "tokenarena-opencode-"));
    createdDirs.push(rootDir);

    const sessionDir = join(rootDir, "storage", "message", "ses_3");
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      join(sessionDir, "msg-0.json"),
      JSON.stringify({
        role: "assistant",
        modelID: "gpt-4",
        tokens: { input: 100, output: 50 },
        // no time.created or created field
      }),
      "utf-8",
    );

    const parser = new OpenCodeParser(() => [rootDir]);
    const result = await parser.parse();
    expect(result.buckets).toEqual([]);
  });

  it("skips messages without modelID", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "tokenarena-opencode-"));
    createdDirs.push(rootDir);

    const sessionDir = join(rootDir, "storage", "message", "ses_4");
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      join(sessionDir, "msg-0.json"),
      JSON.stringify({
        role: "assistant",
        time: { created: "2026-01-15T10:00:00.000Z" },
        tokens: { input: 100, output: 50 },
      }),
      "utf-8",
    );

    const parser = new OpenCodeParser(() => [rootDir]);
    const result = await parser.parse();
    // No buckets because no modelID, but session events should exist for user/assistant
    expect(result.buckets).toEqual([]);
  });

  it("isInstalled returns true when dir exists", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "tokenarena-opencode-"));
    createdDirs.push(rootDir);
    const parser = new OpenCodeParser(() => [rootDir]);
    expect(parser.isInstalled()).toBe(true);
  });

  it("isInstalled returns false when no dirs exist", () => {
    const parser = new OpenCodeParser(() => ["/nonexistent/path"]);
    expect(parser.isInstalled()).toBe(false);
  });
});
