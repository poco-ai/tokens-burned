import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock `node:fs` so we can control statSync / readFileSync / readdirSync
// without touching the real filesystem for the parser's discovery logic.
// Mock process.platform so the parser always uses the darwin path.
// ---------------------------------------------------------------------------

const EXTENSION_ID = "rooveterinaryinc.roo-cline";
const darwinRoot = join(homedir(), "Library", "Application Support", "Code");
const extDir = join(darwinRoot, "User", "globalStorage", EXTENSION_ID);

// A map from absolute path → file content the mocked readFileSync returns.
const fileContents = new Map<string, string>();
// A set of paths that statSync reports as existing directories.
const directoryPaths = new Set<string>();
// A map from absolute dir path → Dirent-like objects for readdirSync.
const dirEntries = new Map<
  string,
  { name: string; isDirectory(): boolean }[]
>();

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
    readdirSync(path: string, _opts?: { withFileTypes?: boolean }) {
      if (dirEntries.has(path)) return dirEntries.get(path) ?? [];
      throw new Error(
        `ENOENT: no such file or directory, readdirSync '${path}'`,
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

function addDirEntries(
  dirPath: string,
  entries: { name: string; isDirectory(): boolean }[],
) {
  dirEntries.set(dirPath, entries);
}

async function getParser() {
  // Import the module so registerParser() runs with our mocks in place
  await import("./roo-code");
  const { getParser: lookup } = await import("./registry");
  const parser = lookup("roo-code");
  if (!parser) throw new Error("roo-code parser not found");
  return parser;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RooCodeParser", () => {
  beforeEach(() => {
    fileContents.clear();
    directoryPaths.clear();
    dirEntries.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty when no extension dirs exist", async () => {
    // Don't set up extDir, so findExtensionDirs() returns []
    const parser = await getParser();
    const result = await parser.parse();
    expect(result.buckets).toEqual([]);
    expect(result.sessions).toEqual([]);
  });

  it("parses from _index.json entries", async () => {
    setupExtDir();

    const taskId = "task-001";
    const tasksDir = join(extDir, "tasks");

    // _index.json with entries
    addFile(
      join(tasksDir, "_index.json"),
      JSON.stringify({
        entries: [
          {
            id: taskId,
            workspace: "/home/user/projects/my-app",
            apiConfigName: "claude-sonnet",
          },
        ],
      }),
    );

    // ui_messages.json for the task
    addFile(
      join(tasksDir, taskId, "ui_messages.json"),
      JSON.stringify([
        {
          type: "say",
          say: "api_req_started",
          ts: 1712880000000,
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

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0]).toMatchObject({
      source: "roo-code",
      model: "claude-3",
      project: "my-app",
      inputTokens: 110, // tokensIn(100) + cacheWrites(10)
      outputTokens: 50,
      cachedTokens: 5,
    });
    expect(result.sessions).toHaveLength(1);
  });

  it("falls back to directory scanning when no _index.json", async () => {
    setupExtDir();

    const taskId = "task-002";
    const tasksDir = join(extDir, "tasks");

    // No _index.json – readdirSync will list the task directory
    addDirEntries(tasksDir, [
      { name: "_index.json", isDirectory: () => false }, // skipped (starts with _)
      { name: taskId, isDirectory: () => true },
    ]);

    // history_item.json inside the task directory
    addFile(
      join(tasksDir, taskId, "history_item.json"),
      JSON.stringify({
        id: taskId,
        workspace: "/home/user/projects/fallback-proj",
        apiConfigName: "gpt-4",
      }),
    );

    // ui_messages.json
    addFile(
      join(tasksDir, taskId, "ui_messages.json"),
      JSON.stringify([
        {
          type: "say",
          say: "api_req_started",
          ts: 1712883600000,
          text: JSON.stringify({
            tokensIn: 200,
            tokensOut: 100,
            cacheWrites: 20,
            cacheReads: 10,
            model: "gpt-4o",
          }),
        },
      ]),
    );

    const parser = await getParser();
    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0]).toMatchObject({
      source: "roo-code",
      model: "gpt-4o",
      project: "fallback-proj",
      inputTokens: 220, // 200 + 20
      outputTokens: 100,
      cachedTokens: 10,
    });
  });

  it("handles api_req_started messages with token data", async () => {
    setupExtDir();

    const taskId = "task-003";
    const tasksDir = join(extDir, "tasks");

    addFile(
      join(tasksDir, "_index.json"),
      JSON.stringify({
        entries: [{ id: taskId, workspace: "/home/user/proj" }],
      }),
    );

    // Multiple api_req_started messages, including one with zero tokens (skipped)
    // and one with invalid JSON in text (skipped)
    addFile(
      join(tasksDir, taskId, "ui_messages.json"),
      JSON.stringify([
        {
          type: "say",
          say: "api_req_started",
          ts: 1712880000000,
          text: JSON.stringify({
            tokensIn: 500,
            tokensOut: 250,
            cacheWrites: 50,
            cacheReads: 25,
            model: "claude-sonnet-4",
          }),
        },
        {
          type: "say",
          say: "api_req_started",
          ts: 1712880100000,
          text: "not-valid-json", // should be skipped
        },
        {
          type: "say",
          say: "api_req_started",
          ts: 1712880200000,
          text: JSON.stringify({
            tokensIn: 0,
            tokensOut: 0,
            cacheWrites: 0,
            cacheReads: 0,
          }), // zero tokens – should be skipped
        },
        {
          type: "say",
          say: "api_req_started",
          ts: 1712880300000,
          text: JSON.stringify({
            tokensIn: 100,
            tokensOut: 80,
            cacheWrites: 0,
            cacheReads: 0,
            model: "gpt-4o",
          }),
        },
      ]),
    );

    const parser = await getParser();
    const result = await parser.parse();

    // Only 2 valid entries should produce buckets
    const totalInput = result.buckets.reduce((s, b) => s + b.inputTokens, 0);
    const totalOutput = result.buckets.reduce((s, b) => s + b.outputTokens, 0);
    const totalCached = result.buckets.reduce((s, b) => s + b.cachedTokens, 0);

    // First: inputTokens=500+50=550, outputTokens=250, cachedTokens=25
    // Fourth: inputTokens=100+0=100, outputTokens=80, cachedTokens=0
    expect(totalInput).toBe(650);
    expect(totalOutput).toBe(330);
    expect(totalCached).toBe(25);
  });

  it("extracts user feedback events", async () => {
    setupExtDir();

    const taskId = "task-004";
    const tasksDir = join(extDir, "tasks");

    addFile(
      join(tasksDir, "_index.json"),
      JSON.stringify({
        entries: [{ id: taskId, workspace: "/home/user/proj" }],
      }),
    );

    addFile(
      join(tasksDir, taskId, "ui_messages.json"),
      JSON.stringify([
        {
          type: "ask",
          ts: 1712880000000,
        },
        {
          type: "say",
          say: "api_req_started",
          ts: 1712880010000,
          text: JSON.stringify({
            tokensIn: 100,
            tokensOut: 50,
            cacheWrites: 0,
            cacheReads: 0,
            model: "claude-3",
          }),
        },
        {
          type: "say",
          say: "user_feedback",
          ts: 1712880020000,
        },
        {
          type: "say",
          say: "api_req_started",
          ts: 1712880030000,
          text: JSON.stringify({
            tokensIn: 200,
            tokensOut: 100,
            cacheWrites: 0,
            cacheReads: 0,
            model: "claude-3",
          }),
        },
      ]),
    );

    const parser = await getParser();
    const result = await parser.parse();

    // Should have sessions with user and assistant events
    expect(result.sessions.length).toBeGreaterThanOrEqual(1);

    // Check that the session was created and has messages
    const session = result.sessions[0];
    expect(session).toBeDefined();
    expect(session.messageCount).toBeGreaterThan(0);

    // Verify there are user events (from "ask" and "user_feedback")
    expect(session.userMessageCount).toBeGreaterThanOrEqual(1);
  });
});
