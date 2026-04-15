import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getOpenClawRoots, OpenClawParser } from "./openclaw";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("getOpenClawRoots", () => {
  it("includes profile deployments alongside the default and legacy roots", () => {
    const homeDir = makeTempDir("tokenarena-openclaw-home-");

    mkdirSync(join(homeDir, ".openclaw-prod"), { recursive: true });
    mkdirSync(join(homeDir, ".openclaw-dev"), { recursive: true });
    mkdirSync(join(homeDir, ".not-openclaw"), { recursive: true });
    writeFileSync(join(homeDir, ".openclaw-file"), "", "utf-8");

    expect(getOpenClawRoots(homeDir)).toEqual([
      join(homeDir, ".openclaw"),
      join(homeDir, ".openclaw-dev"),
      join(homeDir, ".openclaw-prod"),
      join(homeDir, ".clawdbot"),
      join(homeDir, ".moltbot"),
      join(homeDir, ".moldbot"),
    ]);
  });
});

describe("OpenClawParser", () => {
  it("detects installations from profile deployment roots", () => {
    const homeDir = makeTempDir("tokenarena-openclaw-install-");
    const profileRoot = join(homeDir, ".openclaw-work");
    mkdirSync(join(profileRoot, "agents"), { recursive: true });

    const parser = new OpenClawParser(() => getOpenClawRoots(homeDir));

    expect(parser.isInstalled()).toBe(true);
  });

  it("parses sessions from profile deployment roots", async () => {
    const homeDir = makeTempDir("tokenarena-openclaw-parse-");
    const sessionDir = join(
      homeDir,
      ".openclaw-prod",
      "agents",
      "demo-agent",
      "sessions",
    );
    mkdirSync(sessionDir, { recursive: true });

    const sessionPath = join(sessionDir, "session-1.jsonl");
    writeFileSync(
      sessionPath,
      [
        JSON.stringify({
          type: "message",
          timestamp: "2026-03-26T10:00:00.000Z",
          message: { role: "user" },
        }),
        JSON.stringify({
          type: "message",
          timestamp: "2026-03-26T10:00:05.000Z",
          message: {
            role: "assistant",
            model: "openclaw-v1",
            usage: {
              input_tokens: 120,
              completion_tokens: 45,
              cache_read_input_tokens: 30,
            },
          },
        }),
      ].join("\n"),
      "utf-8",
    );

    const parser = new OpenClawParser(() => getOpenClawRoots(homeDir));
    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0]).toMatchObject({
      source: "openclaw",
      model: "openclaw-v1",
      project: "demo-agent",
      inputTokens: 120,
      outputTokens: 45,
      reasoningTokens: 0,
      cachedTokens: 30,
      totalTokens: 195,
    });

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toMatchObject({
      source: "openclaw",
      project: "demo-agent",
      durationSeconds: 5,
      messageCount: 2,
      userMessageCount: 1,
      inputTokens: 120,
      outputTokens: 45,
      reasoningTokens: 0,
      cachedTokens: 30,
      totalTokens: 195,
      primaryModel: "openclaw-v1",
    });
  });
});
