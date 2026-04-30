import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { QwenPawParser } from "./qwenpaw";

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

describe("QwenPawParser", () => {
  it("parses daily token_usage.json records into buckets", async () => {
    const dataDir = makeTempDir("tokenarena-qwenpaw-");
    const usagePath = join(dataDir, "token_usage.json");
    writeFileSync(
      usagePath,
      JSON.stringify({
        "2026-04-29": {
          "poco:grok-4.20-0309-reasoning": {
            provider_id: "poco",
            model_name: "grok-4.20-0309-reasoning",
            prompt_tokens: 14313115,
            completion_tokens: 94528,
            call_count: 523,
          },
        },
      }),
      "utf-8",
    );

    const emptyWorkspace = makeTempDir("tokenarena-qwenpaw-ws-");
    const parser = new QwenPawParser({
      usagePath,
      workspacePath: emptyWorkspace,
    });
    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0]).toMatchObject({
      source: "qwenpaw",
      model: "poco:grok-4.20-0309-reasoning",
      project: "unknown",
      bucketStart: "2026-04-29T00:00:00.000Z",
      inputTokens: 14313115,
      outputTokens: 94528,
      reasoningTokens: 0,
      cachedTokens: 0,
      totalTokens: 14407643,
    });
    expect(result.sessions).toEqual([]);
  });

  it("falls back to record key when provider and model are missing", async () => {
    const dataDir = makeTempDir("tokenarena-qwenpaw-");
    const usagePath = join(dataDir, "token_usage.json");
    writeFileSync(
      usagePath,
      JSON.stringify({
        "2026-04-29": {
          "custom:model": {
            prompt_tokens: 10,
            completion_tokens: 5,
          },
        },
      }),
      "utf-8",
    );

    const emptyWorkspace = makeTempDir("tokenarena-qwenpaw-ws-");
    const parser = new QwenPawParser({
      usagePath,
      workspacePath: emptyWorkspace,
    });
    const result = await parser.parse();

    expect(result.buckets[0]?.model).toBe("custom:model");
  });

  it("parses workspace sessions into session metadata", async () => {
    const workspaceBase = makeTempDir("tokenarena-qwenpaw-workspace-");
    const workspacePath = join(workspaceBase, "default");
    mkdirSync(workspacePath);
    mkdirSync(join(workspacePath, "sessions"));

    // Create chats.json
    const chatsPath = join(workspacePath, "chats.json");
    writeFileSync(
      chatsPath,
      JSON.stringify({
        chats: [
          {
            channel: "console",
            created_at: "2026-04-29T06:05:35.054638Z",
            id: "0390e8e8-07a1-4f03-9aa9-aaa18889446b",
            name: "重新测试 cdp 的",
            session_id: "1777442725936",
            user_id: "default",
            status: "idle",
            updated_at: "2026-04-29T06:09:09.729529Z",
          },
        ],
        version: 1,
      }),
      "utf-8",
    );

    // Create session file
    const sessionFilePath = join(
      workspacePath,
      "sessions",
      "default_1777442725936.json",
    );
    writeFileSync(
      sessionFilePath,
      JSON.stringify({
        agent: {
          memory: {
            content: [
              [
                {
                  id: "msg_1",
                  name: "user",
                  role: "user",
                  content: [{ type: "text", text: "测试消息" }],
                  timestamp: "2026-04-29 06:05:35.562",
                  metadata: {},
                },
                null,
              ],
              [
                {
                  id: "msg_2",
                  name: "assistant",
                  role: "assistant",
                  content: [{ type: "text", text: "回复消息" }],
                  timestamp: "2026-04-29 06:05:40.123",
                  metadata: {},
                },
                null,
              ],
            ],
          },
        },
      }),
      "utf-8",
    );

    const parser = new QwenPawParser({ workspacePath: workspaceBase });
    const result = await parser.parse();

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toMatchObject({
      source: "qwenpaw",
      project: "default",
      sessionHash: "1777442725936",
      messageCount: 2,
      userMessageCount: 1,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });
    expect(result.sessions[0].durationSeconds).toBeGreaterThan(0);
  });

  it("handles malformed workspace data gracefully", async () => {
    const workspaceBase = makeTempDir("tokenarena-qwenpaw-workspace-");
    const workspacePath = join(workspaceBase, "default");
    mkdirSync(workspacePath);
    mkdirSync(join(workspacePath, "sessions"));

    // Create invalid chats.json
    const chatsPath = join(workspacePath, "chats.json");
    writeFileSync(chatsPath, "invalid json", "utf-8");

    const parser = new QwenPawParser({ workspacePath: workspaceBase });
    const result = await parser.parse();

    // Should not throw, just return empty sessions
    expect(result.sessions).toEqual([]);
  });

  it("isInstalled returns true when workspace exists", () => {
    const workspaceBase = makeTempDir("tokenarena-qwenpaw-installed-");
    const workspacePath = join(workspaceBase, "default");
    mkdirSync(workspacePath);

    const parser = new QwenPawParser({ workspacePath: workspaceBase });
    expect(parser.isInstalled()).toBe(true);
  });
});
