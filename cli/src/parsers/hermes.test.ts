import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HermesParser } from "./hermes";

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

describe("HermesParser", () => {
  it("parses Hermes sqlite sessions and message timing data", async () => {
    const dataDir = makeTempDir("tokenarena-hermes-");
    const dbPath = join(dataDir, "state.db");
    writeFileSync(dbPath, "", "utf-8");

    const parser = new HermesParser({
      dbPath,
      queryRows: async <TRow>(targetDbPath: string, query: string) => {
        expect(targetDbPath).toBe(dbPath);

        if (query.includes("FROM sessions")) {
          return [
            {
              id: "sess-1",
              model: "claude-sonnet-4.5",
              startedAt: 1713002400,
              inputTokens: 100,
              outputTokens: 70,
              cacheReadTokens: 20,
              reasoningTokens: 10,
            },
          ] as TRow[];
        }

        if (query.includes("FROM messages")) {
          return [
            {
              sessionId: "sess-1",
              role: "user",
              timestamp: 1713002400,
            },
            {
              sessionId: "sess-1",
              role: "assistant",
              timestamp: 1713002404,
            },
            {
              sessionId: "sess-1",
              role: "assistant",
              timestamp: 1713002406,
            },
          ] as TRow[];
        }

        return [];
      },
    });

    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0]).toMatchObject({
      source: "hermes",
      model: "claude-sonnet-4.5",
      project: "unknown",
      inputTokens: 100,
      outputTokens: 70,
      reasoningTokens: 10,
      cachedTokens: 20,
      totalTokens: 200,
    });

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toMatchObject({
      source: "hermes",
      project: "unknown",
      durationSeconds: 6,
      activeSeconds: 2,
      messageCount: 3,
      userMessageCount: 1,
      inputTokens: 100,
      outputTokens: 70,
      reasoningTokens: 10,
      cachedTokens: 20,
      totalTokens: 200,
      primaryModel: "claude-sonnet-4.5",
    });
  });

  it("returns buckets when the messages query fails", async () => {
    const dataDir = makeTempDir("tokenarena-hermes-");
    const dbPath = join(dataDir, "state.db");
    writeFileSync(dbPath, "", "utf-8");

    const parser = new HermesParser({
      dbPath,
      queryRows: async <TRow>(targetDbPath: string, query: string) => {
        expect(targetDbPath).toBe(dbPath);

        if (query.includes("FROM sessions")) {
          return [
            {
              id: "sess-1",
              model: "gpt-5.4",
              startedAt: 1713002400,
              inputTokens: 90,
              outputTokens: 30,
              cacheReadTokens: 10,
              reasoningTokens: 0,
            },
          ] as TRow[];
        }

        throw new Error("messages table missing");
      },
    });

    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.sessions).toEqual([]);
    expect(result.buckets[0]).toMatchObject({
      source: "hermes",
      model: "gpt-5.4",
      inputTokens: 90,
      outputTokens: 30,
      cachedTokens: 10,
      totalTokens: 130,
    });
  });
});
