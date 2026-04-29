import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  extractGsdProjectFromCwd,
  extractGsdProjectFromDir,
  GsdParser,
} from "./gsd";

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

describe("gsd project resolution", () => {
  it("extracts the cwd leaf when a session header is present", () => {
    expect(extractGsdProjectFromCwd("/Users/dev/tokenarena")).toBe(
      "tokenarena",
    );
  });

  it("decodes URI-encoded workspace directories", () => {
    expect(
      extractGsdProjectFromDir(
        "/tmp/sessions/%2FUsers%2Fdev%2Ftokenarena/session-1.jsonl",
        "/tmp/sessions",
      ),
    ).toBe("tokenarena");
  });
});

describe("GsdParser", () => {
  it("parses GSD-2 sessions and ignores toolResult messages", async () => {
    const sessionsDir = makeTempDir("tokenarena-gsd-");
    const sessionFileDir = join(sessionsDir, "workspace-tokenarena");
    mkdirSync(sessionFileDir, { recursive: true });

    const sessionPath = join(sessionFileDir, "20260326_sess-1.jsonl");
    writeFileSync(
      sessionPath,
      [
        JSON.stringify({
          type: "session",
          id: "sess-1",
          cwd: "/Users/dev/tokenarena",
        }),
        JSON.stringify({
          type: "message",
          timestamp: "2026-03-26T10:00:00.000Z",
          message: { role: "user" },
        }),
        JSON.stringify({
          type: "message",
          id: "msg-1",
          timestamp: "2026-03-26T10:00:04.000Z",
          message: {
            role: "assistant",
            model: "gpt-5.4",
            usage: {
              input: 100,
              output: 30,
              cacheRead: 20,
            },
          },
        }),
        JSON.stringify({
          type: "message",
          timestamp: "2026-03-26T10:00:05.000Z",
          message: { role: "toolResult" },
        }),
      ].join("\n"),
      "utf-8",
    );

    const parser = new GsdParser(sessionsDir);
    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0]).toMatchObject({
      source: "gsd",
      model: "gpt-5.4",
      project: "tokenarena",
      inputTokens: 100,
      outputTokens: 30,
      reasoningTokens: 0,
      cachedTokens: 20,
      totalTokens: 150,
    });

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toMatchObject({
      source: "gsd",
      project: "tokenarena",
      durationSeconds: 4,
      messageCount: 2,
      userMessageCount: 1,
      inputTokens: 100,
      outputTokens: 30,
      reasoningTokens: 0,
      cachedTokens: 20,
      totalTokens: 150,
      primaryModel: "gpt-5.4",
    });
  });
});
