import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DATA_DIR = join(homedir(), ".gemini", "tmp");

const fileContents = new Map<string, string>();
const existingPaths = new Set<string>();
const dirEntries = new Map<
  string,
  { name: string; isDirectory(): boolean }[]
>();

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync(path: string) {
      if (existingPaths.has(path)) return true;
      return false;
    },
    readdirSync(path: string, opts?: { withFileTypes?: boolean }) {
      if (dirEntries.has(path)) {
        const entries = dirEntries.get(path);
        if (!entries) return [];
        if (opts?.withFileTypes) return entries;
        return entries.map((e) => e.name);
      }
      return actual.readdirSync(path, opts);
    },
    readFileSync(path: string, encoding: string) {
      if (fileContents.has(path)) return fileContents.get(path);
      return actual.readFileSync(path, encoding);
    },
  };
});

function addPath(p: string) {
  existingPaths.add(p);
}

function addDir(
  dirPath: string,
  entries: { name: string; isDirectory(): boolean }[],
) {
  existingPaths.add(dirPath);
  dirEntries.set(dirPath, entries);
}

function addFile(path: string, content: string) {
  existingPaths.add(path);
  fileContents.set(path, content);
}

async function getParser() {
  await import("./gemini-cli");
  const { getParser: lookup } = await import("./registry");
  const parser = lookup("gemini-cli");
  if (!parser) throw new Error("gemini-cli parser not found");
  return parser;
}

describe("GeminiCliParser", () => {
  beforeEach(() => {
    fileContents.clear();
    existingPaths.clear();
    dirEntries.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty when no data dir", async () => {
    // Don't set up DATA_DIR, so existsSync returns false
    const parser = await getParser();
    const result = await parser.parse();

    expect(result.buckets).toEqual([]);
    expect(result.sessions).toEqual([]);
  });

  it("parses messages with tokens field", async () => {
    const subDir = join(DATA_DIR, "abc123");
    const chatsDir = join(subDir, "chats");
    const sessionFile = join(chatsDir, "session-001.json");

    addPath(DATA_DIR);
    addDir(DATA_DIR, [{ name: "abc123", isDirectory: () => true }]);
    addPath(chatsDir);
    addDir(chatsDir, [{ name: "session-001.json", isDirectory: () => false }]);
    addFile(
      sessionFile,
      JSON.stringify({
        messages: [
          { role: "user", timestamp: "2026-01-01T00:00:00Z" },
          {
            role: "assistant",
            timestamp: "2026-01-01T00:00:01Z",
            model: "gemini-pro",
            tokens: { input: 100, output: 50, cached: 10, thoughts: 5 },
          },
        ],
      }),
    );

    const parser = await getParser();
    const result = await parser.parse();

    expect(result.buckets.length).toBeGreaterThanOrEqual(1);

    const bucket = result.buckets.find((b) => b.model === "gemini-pro");
    expect(bucket).toMatchObject({
      source: "gemini-cli",
      model: "gemini-pro",
      project: "unknown",
      inputTokens: 90, // 100 - 10 cached
      outputTokens: 50,
      reasoningTokens: 5,
      cachedTokens: 10,
    });

    expect(result.sessions.length).toBeGreaterThanOrEqual(1);
  });

  it("parses messages with usage field", async () => {
    const subDir = join(DATA_DIR, "def456");
    const chatsDir = join(subDir, "chats");
    const sessionFile = join(chatsDir, "session-002.json");

    addPath(DATA_DIR);
    addDir(DATA_DIR, [{ name: "def456", isDirectory: () => true }]);
    addPath(chatsDir);
    addDir(chatsDir, [{ name: "session-002.json", isDirectory: () => false }]);
    addFile(
      sessionFile,
      JSON.stringify({
        messages: [
          { role: "user", timestamp: "2026-01-02T00:00:00Z" },
          {
            role: "assistant",
            timestamp: "2026-01-02T00:00:01Z",
            model: "gemini-2.5-flash",
            usage: {
              promptTokenCount: 200,
              candidatesTokenCount: 80,
              cachedContentTokenCount: 20,
              thoughtsTokenCount: 10,
            },
          },
        ],
      }),
    );

    const parser = await getParser();
    const result = await parser.parse();

    expect(result.buckets.length).toBeGreaterThanOrEqual(1);

    const bucket = result.buckets.find((b) => b.model === "gemini-2.5-flash");
    expect(bucket).toMatchObject({
      source: "gemini-cli",
      model: "gemini-2.5-flash",
      project: "unknown",
      inputTokens: 180, // 200 - 20 cached
      outputTokens: 80,
      reasoningTokens: 10,
      cachedTokens: 20,
    });
  });

  it("ignores non-user/assistant roles", async () => {
    const subDir = join(DATA_DIR, "ghi789");
    const chatsDir = join(subDir, "chats");
    const sessionFile = join(chatsDir, "session-003.json");

    addPath(DATA_DIR);
    addDir(DATA_DIR, [{ name: "ghi789", isDirectory: () => true }]);
    addPath(chatsDir);
    addDir(chatsDir, [{ name: "session-003.json", isDirectory: () => false }]);
    addFile(
      sessionFile,
      JSON.stringify({
        messages: [
          { role: "system", timestamp: "2026-01-03T00:00:00Z" },
          {
            role: "tool",
            timestamp: "2026-01-03T00:00:01Z",
            model: "gemini-pro",
            tokens: { input: 50, output: 25 },
          },
          { role: "user", timestamp: "2026-01-03T00:00:02Z" },
        ],
      }),
    );

    const parser = await getParser();
    const result = await parser.parse();

    // system and tool roles are ignored; only user produces a session event
    // but user has no tokens field, so no token buckets
    expect(result.buckets).toEqual([]);
    // There should be at least one session from the user message
    expect(result.sessions.length).toBeGreaterThanOrEqual(1);
    for (const session of result.sessions) {
      for (const mu of session.modelUsages) {
        expect(mu.totalTokens).toBe(0);
      }
    }
  });

  it("handles invalid JSON files", async () => {
    const badSubDir = join(DATA_DIR, "jkl012");
    const badChatsDir = join(badSubDir, "chats");
    const badFile = join(badChatsDir, "session-bad.json");

    const goodSubDir = join(DATA_DIR, "good");
    const goodChatsDir = join(goodSubDir, "chats");
    const goodFile = join(goodChatsDir, "session-good.json");

    addPath(DATA_DIR);
    addDir(DATA_DIR, [
      { name: "jkl012", isDirectory: () => true },
      { name: "good", isDirectory: () => true },
    ]);

    addPath(badChatsDir);
    addDir(badChatsDir, [
      { name: "session-bad.json", isDirectory: () => false },
    ]);
    addFile(badFile, "this is not valid json{{{");

    addPath(goodChatsDir);
    addDir(goodChatsDir, [
      { name: "session-good.json", isDirectory: () => false },
    ]);
    addFile(
      goodFile,
      JSON.stringify({
        messages: [
          { role: "user", timestamp: "2026-01-04T00:00:00Z" },
          {
            role: "assistant",
            timestamp: "2026-01-04T00:00:01Z",
            model: "gemini-pro",
            tokens: { input: 30, output: 15 },
          },
        ],
      }),
    );

    const parser = await getParser();
    const result = await parser.parse();

    // Should have parsed the good file and skipped the bad one
    const bucket = result.buckets.find((b) => b.model === "gemini-pro");
    expect(bucket).toMatchObject({
      source: "gemini-cli",
      model: "gemini-pro",
      inputTokens: 30,
      outputTokens: 15,
    });
  });
});
