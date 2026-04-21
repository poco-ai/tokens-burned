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
});
