import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock `node:fs` so we can control statSync / readFileSync without touching
// the real filesystem. The parser uses these for platform-specific discovery.
// ---------------------------------------------------------------------------

const EXTENSION_ID = "saoudrizwan.claude-dev";
const darwinRoot = join(homedir(), "Library", "Application Support", "Code");
const extDir = join(darwinRoot, "User", "globalStorage", EXTENSION_ID);

// A map from absolute path -> file content the mocked readFileSync returns.
const fileContents = new Map<string, string>();
// A set of paths that statSync reports as existing directories.
const directoryPaths = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    statSync(path: string) {
      if (directoryPaths.has(path)) {
        return {
          isDirectory: () => true,
        } as ReturnType<typeof actual.statSync>;
      }
      throw new Error(`ENOENT: no such file or directory, statSync '${path}'`);
    },
    readFileSync(path: string, _encoding: string) {
      if (fileContents.has(path)) return fileContents.get(path);
      throw new Error(
        `ENOENT: no such file or directory, readFileSync '${path}'`,
      );
    },
  };
});

// Force darwin platform for every test.
vi.stubGlobal("process", { ...process, platform: "darwin" });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupExtDir() {
  directoryPaths.add(extDir);
}

function addFile(path: string, content: string) {
  fileContents.set(path, content);
}

async function getParser() {
  await import("./cline");
  const { getParser: lookup } = await import("./registry");
  const parser = lookup("cline");
  if (!parser) throw new Error("cline parser not found");
  return parser;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ClineParser", () => {
  beforeEach(() => {
    fileContents.clear();
    directoryPaths.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Returns empty when no extension dirs found
  it("returns empty when no extension dirs exist", async () => {
    // Don't set up extDir, so findClineExtensionDirs() returns []
    const parser = await getParser();
    const result = await parser.parse();
    expect(result.buckets).toEqual([]);
    expect(result.sessions).toEqual([]);
  });

  // 2. Parses task history with token usage
  it("parses task history with token usage", async () => {
    setupExtDir();

    const taskId = "abc-123";
    const ts = new Date("2025-05-10T12:00:00.000Z").getTime();

    addFile(
      join(extDir, "state", "taskHistory.json"),
      JSON.stringify([
        {
          id: taskId,
          cwdOnTaskInitialization: "/home/user/my-project",
          modelId: "claude-sonnet-4-20250514",
        },
      ]),
    );

    addFile(
      join(extDir, "tasks", taskId, "ui_messages.json"),
      JSON.stringify([
        {
          type: "say",
          say: "api_req_started",
          ts,
          text: JSON.stringify({
            tokensIn: 100,
            tokensOut: 50,
            cacheWrites: 10,
            cacheReads: 5,
            model: "claude-3",
          }),
        },
      ]),
    );

    const parser = await getParser();
    const result = await parser.parse();

    // Expect at least one bucket with the aggregated token data
    expect(result.buckets.length).toBeGreaterThanOrEqual(1);

    const bucket = result.buckets[0];
    expect(bucket.source).toBe("cline");
    expect(bucket.model).toBe("claude-3");
    // inputTokens = tokensIn + cacheWrites = 100 + 10 = 110
    expect(bucket.inputTokens).toBe(110);
    expect(bucket.outputTokens).toBe(50);
    expect(bucket.cachedTokens).toBe(5);
    expect(bucket.totalTokens).toBe(110 + 50 + 0 + 5);
  });

  // 3. Handles malformed message text
  it("handles malformed message text gracefully", async () => {
    setupExtDir();

    const taskId = "bad-text-task";
    const ts = new Date("2025-05-10T12:00:00.000Z").getTime();

    addFile(
      join(extDir, "state", "taskHistory.json"),
      JSON.stringify([
        {
          id: taskId,
          cwdOnTaskInitialization: "/home/user/broken",
          modelId: "model-x",
        },
      ]),
    );

    addFile(
      join(extDir, "tasks", taskId, "ui_messages.json"),
      JSON.stringify([
        // Malformed JSON in text — should be skipped
        {
          type: "say",
          say: "api_req_started",
          ts,
          text: "this is not valid JSON{{{",
        },
        // Valid entry should still be parsed after the malformed one
        {
          type: "say",
          say: "api_req_started",
          ts,
          text: JSON.stringify({
            tokensIn: 200,
            tokensOut: 80,
            cacheWrites: 0,
            cacheReads: 0,
            model: "good-model",
          }),
        },
      ]),
    );

    const parser = await getParser();
    const result = await parser.parse();

    // Only the valid message should produce a bucket
    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0].model).toBe("good-model");
    expect(result.buckets[0].inputTokens).toBe(200);
    expect(result.buckets[0].outputTokens).toBe(80);
  });

  // 4. Extracts project from cwdOnTaskInitialization
  it("extracts project name from cwdOnTaskInitialization", async () => {
    setupExtDir();

    const taskId = "proj-task";
    const ts = new Date("2025-05-10T14:00:00.000Z").getTime();

    addFile(
      join(extDir, "state", "taskHistory.json"),
      JSON.stringify([
        {
          id: taskId,
          cwdOnTaskInitialization: "/Users/dev/some/deep/path/tokens-burned",
          modelId: "test-model",
        },
      ]),
    );

    addFile(
      join(extDir, "tasks", taskId, "ui_messages.json"),
      JSON.stringify([
        {
          type: "say",
          say: "api_req_started",
          ts,
          text: JSON.stringify({
            tokensIn: 500,
            tokensOut: 250,
            cacheWrites: 20,
            cacheReads: 10,
          }),
        },
      ]),
    );

    const parser = await getParser();
    const result = await parser.parse();

    expect(result.buckets.length).toBeGreaterThanOrEqual(1);
    expect(result.buckets[0].project).toBe("tokens-burned");
  });

  it("skips messages with zero total tokens", async () => {
    setupExtDir();

    const taskId = "zero-task";
    const ts = new Date("2025-05-10T12:00:00.000Z").getTime();

    addFile(
      join(extDir, "state", "taskHistory.json"),
      JSON.stringify([{ id: taskId, modelId: "model-z" }]),
    );

    addFile(
      join(extDir, "tasks", taskId, "ui_messages.json"),
      JSON.stringify([
        {
          type: "say",
          say: "api_req_started",
          ts,
          text: JSON.stringify({
            tokensIn: 0,
            tokensOut: 0,
            cacheWrites: 0,
            cacheReads: 0,
          }),
        },
      ]),
    );

    const parser = await getParser();
    const result = await parser.parse();

    expect(result.buckets).toEqual([]);
    expect(result.sessions).toEqual([]);
  });

  it("extracts sessions with user and assistant events", async () => {
    setupExtDir();

    const taskId = "sess-1";
    const ts = new Date("2025-05-10T10:00:00.000Z").getTime();

    addFile(
      join(extDir, "state", "taskHistory.json"),
      JSON.stringify([
        {
          id: taskId,
          cwdOnTaskInitialization: "/workspace/app",
          modelId: "claude-3",
        },
      ]),
    );

    addFile(
      join(extDir, "tasks", taskId, "ui_messages.json"),
      JSON.stringify([
        { type: "ask", ts: ts - 1000, text: "hello" },
        {
          type: "say",
          say: "api_req_started",
          ts,
          text: JSON.stringify({
            tokensIn: 50,
            tokensOut: 30,
            cacheWrites: 0,
            cacheReads: 0,
            model: "claude-3",
          }),
        },
        {
          type: "say",
          say: "user_feedback",
          ts: ts + 5000,
          text: "thanks",
        },
      ]),
    );

    const parser = await getParser();
    const result = await parser.parse();

    // Should have sessions extracted from user/assistant events
    expect(result.sessions.length).toBeGreaterThanOrEqual(1);
    expect(result.sessions[0].source).toBe("cline");
    expect(result.sessions[0].project).toBe("app");
    expect(result.sessions[0].messageCount).toBeGreaterThanOrEqual(2);
    expect(result.sessions[0].userMessageCount).toBeGreaterThanOrEqual(2);
  });

  it("falls back to modelId when text has no model field", async () => {
    setupExtDir();

    const taskId = "fallback-model";
    const ts = new Date("2025-05-10T12:00:00.000Z").getTime();

    addFile(
      join(extDir, "state", "taskHistory.json"),
      JSON.stringify([
        {
          id: taskId,
          cwdOnTaskInitialization: "/home/user/project",
          modelId: "fallback-model-id",
        },
      ]),
    );

    addFile(
      join(extDir, "tasks", taskId, "ui_messages.json"),
      JSON.stringify([
        {
          type: "say",
          say: "api_req_started",
          ts,
          text: JSON.stringify({
            tokensIn: 100,
            tokensOut: 50,
            cacheWrites: 0,
            cacheReads: 0,
            // no "model" key — should fall back to modelId
          }),
        },
      ]),
    );

    const parser = await getParser();
    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0].model).toBe("fallback-model-id");
  });

  it("uses unknown project when cwdOnTaskInitialization is missing", async () => {
    setupExtDir();

    const taskId = "no-cwd";
    const ts = new Date("2025-05-10T12:00:00.000Z").getTime();

    addFile(
      join(extDir, "state", "taskHistory.json"),
      JSON.stringify([{ id: taskId, modelId: "m1" }]),
    );

    addFile(
      join(extDir, "tasks", taskId, "ui_messages.json"),
      JSON.stringify([
        {
          type: "say",
          say: "api_req_started",
          ts,
          text: JSON.stringify({
            tokensIn: 10,
            tokensOut: 5,
            cacheWrites: 0,
            cacheReads: 0,
            model: "m1",
          }),
        },
      ]),
    );

    const parser = await getParser();
    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0].project).toBe("unknown");
  });
});
