import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const PROJECTS_DIR = join(homedir(), ".claude", "projects");

let projectFiles: { path: string; content: string }[] = [];

vi.mock("../infrastructure/fs/utils", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../infrastructure/fs/utils")>();
  return {
    ...actual,
    findJsonlFiles: vi.fn((dir: string) => {
      if (dir === PROJECTS_DIR) return projectFiles.map((f) => f.path);
      return [];
    }),
    readFileSafe: vi.fn((path: string) => {
      const file = projectFiles.find((f) => f.path === path);
      return file?.content ?? null;
    }),
  };
});

import "./claude-code";
import { getParser } from "./registry";

const parser = getParser("claude-code");
if (!parser) throw new Error("claude-code parser not found");

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
  projectFiles = [];
});

function setupMocks(files: { path: string; content: string }[] = []) {
  projectFiles = files;
}

function userLine(uuid: string, timestamp: string): string {
  return JSON.stringify({ type: "user", timestamp, uuid });
}

function assistantLine(
  uuid: string,
  timestamp: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
  model = "claude-3",
): string {
  return JSON.stringify({
    type: "assistant",
    timestamp,
    uuid,
    message: {
      model,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_read_input_tokens: cacheReadTokens,
      },
    },
  });
}

describe("ClaudeCodeParser", () => {
  it("returns empty results when no files found", async () => {
    setupMocks([]);

    const result = await parser.parse();

    expect(result.buckets).toEqual([]);
    expect(result.sessions).toEqual([]);
  });

  it("parses assistant messages with token usage", async () => {
    const filePath = join(makeTempDir("cc-test-"), "session-abc123.jsonl");
    setupMocks([
      {
        path: filePath,
        content: assistantLine("uuid-1", "2026-01-01T00:00:01Z", 100, 50, 10),
      },
    ]);

    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0]).toMatchObject({
      source: "claude-code",
      model: "claude-3",
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 10,
    });
  });

  it("ignores user messages (no token entries)", async () => {
    const filePath = join(makeTempDir("cc-test-"), "session-abc123.jsonl");
    setupMocks([
      {
        path: filePath,
        content: [
          userLine("uuid-user-1", "2026-01-01T00:00:00Z"),
          assistantLine("uuid-asst-1", "2026-01-01T00:00:01Z", 200, 100),
        ].join("\n"),
      },
    ]);

    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0].inputTokens).toBe(200);
    expect(result.buckets[0].outputTokens).toBe(100);
  });

  it("handles malformed JSON lines gracefully", async () => {
    const filePath = join(makeTempDir("cc-test-"), "session-abc123.jsonl");
    setupMocks([
      {
        path: filePath,
        content: [
          "this is not json",
          assistantLine("uuid-1", "2026-01-01T00:00:01Z", 100, 50),
          "{broken json",
          "",
          "  ",
        ].join("\n"),
      },
    ]);

    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0].inputTokens).toBe(100);
    expect(result.buckets[0].outputTokens).toBe(50);
  });

  it("deduplicates by uuid", async () => {
    const file1 = join(makeTempDir("cc-test-"), "session-1.jsonl");
    const file2 = join(makeTempDir("cc-test-"), "session-2.jsonl");
    const content = assistantLine("same-uuid", "2026-01-01T00:00:01Z", 100, 50);

    setupMocks([
      { path: file1, content },
      { path: file2, content },
    ]);

    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0].inputTokens).toBe(100);
  });

  it("extracts session events for user and assistant messages", async () => {
    const filePath = join(makeTempDir("cc-test-"), "session-abc123.jsonl");
    setupMocks([
      {
        path: filePath,
        content: [
          userLine("uuid-user-1", "2026-01-01T00:00:00Z"),
          assistantLine("uuid-asst-1", "2026-01-01T00:00:01Z", 100, 50),
        ].join("\n"),
      },
    ]);

    const result = await parser.parse();

    expect(result.sessions.length).toBeGreaterThanOrEqual(1);
    const session = result.sessions[0];
    expect(session.messageCount).toBeGreaterThanOrEqual(2);
    expect(session.source).toBe("claude-code");
  });

  it("extracts project name from file path under projects dir", async () => {
    const projectDir = "my-host-my-project";
    const filePath = join(PROJECTS_DIR, projectDir, "session-xyz.jsonl");

    setupMocks([
      {
        path: filePath,
        content: assistantLine("uuid-1", "2026-01-01T00:00:01Z", 100, 50),
      },
    ]);

    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    // extractProject takes the last segment when splitting by "-"
    expect(result.buckets[0].project).toBe("project");
  });

  it("defaults project to unknown for files outside projects dir", async () => {
    const filePath = join(makeTempDir("cc-test-"), "session-abc123.jsonl");
    setupMocks([
      {
        path: filePath,
        content: assistantLine("uuid-1", "2026-01-01T00:00:01Z", 100, 50),
      },
    ]);

    const result = await parser.parse();

    expect(result.buckets[0].project).toBe("unknown");
  });

  it("skips lines without a timestamp", async () => {
    const filePath = join(makeTempDir("cc-test-"), "session-abc123.jsonl");
    setupMocks([
      {
        path: filePath,
        content: [
          JSON.stringify({ type: "assistant", uuid: "no-ts" }),
          assistantLine("uuid-1", "2026-01-01T00:00:01Z", 100, 50),
        ].join("\n"),
      },
    ]);

    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0].inputTokens).toBe(100);
  });

  it("skips assistant messages without usage data", async () => {
    const filePath = join(makeTempDir("cc-test-"), "session-abc123.jsonl");
    setupMocks([
      {
        path: filePath,
        content: [
          JSON.stringify({
            type: "assistant",
            timestamp: "2026-01-01T00:00:01Z",
            uuid: "no-usage",
            message: { model: "claude-3" },
          }),
          assistantLine("uuid-1", "2026-01-01T00:00:02Z", 100, 50),
        ].join("\n"),
      },
    ]);

    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0].inputTokens).toBe(100);
  });

  it("isInstalled returns true when data dirs exist", () => {
    // ~/.claude/projects exists on this machine
    if (existsSync(join(homedir(), ".claude", "projects"))) {
      expect(parser.isInstalled?.()).toBe(true);
    } else {
      expect(parser.isInstalled?.()).toBe(false);
    }
  });
});
