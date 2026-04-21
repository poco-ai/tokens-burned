import { execFileSync } from "node:child_process";
import { type Dirent, existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { aggregateToBuckets } from "../domain/aggregator";
import { extractSessions } from "../domain/session-extractor";
import type {
  ParseResult,
  SessionEvent,
  TokenUsageEntry,
} from "../domain/types";
import { registerParser } from "./registry";
import type { IParser, ToolDefinition } from "./types";

const DEFAULT_DATA_DIR = join(homedir(), ".local", "share", "opencode");

const TOOL: ToolDefinition = {
  id: "opencode",
  name: "OpenCode",
  dataDir: DEFAULT_DATA_DIR,
};

interface OpenCodeMessage {
  sessionID?: string;
  role?: string;
  created?: string;
  modelID?: string;
  tokens?: {
    input?: number;
    output?: number;
    cache?: {
      read?: number;
    };
    reasoning?: number;
  };
  path?: {
    root?: string;
  };
  time?: {
    created?: string;
  };
}

interface SqliteRow {
  sessionID: string;
  role: string;
  created: string;
  modelID: string | null;
  tokens: string | null;
  rootPath: string | null;
}

function getOpenCodeDataDirs(env: NodeJS.ProcessEnv = process.env): string[] {
  const dirs = [
    env.TOKEN_ARENA_OPENCODE_DIR,
    env.XDG_DATA_HOME ? join(env.XDG_DATA_HOME, "opencode") : undefined,
    DEFAULT_DATA_DIR,
    env.LOCALAPPDATA ? join(env.LOCALAPPDATA, "opencode") : undefined,
    env.APPDATA ? join(env.APPDATA, "opencode") : undefined,
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(dirs));
}

async function withSuppressedSqliteWarning<T>(
  fn: () => Promise<T>,
): Promise<T> {
  const originalEmitWarning = process.emitWarning;

  process.emitWarning = ((
    warning: string | Error,
    ...args: unknown[]
  ): void => {
    const warningName =
      typeof warning === "string"
        ? typeof args[0] === "string"
          ? args[0]
          : ""
        : warning.name;
    const warningMessage =
      typeof warning === "string" ? warning : warning.message;

    if (
      warningName === "ExperimentalWarning" &&
      warningMessage.includes("SQLite")
    ) {
      return;
    }

    (
      originalEmitWarning as (
        warning: string | Error,
        ...warningArgs: unknown[]
      ) => void
    ).call(process, warning, ...args);
  }) as typeof process.emitWarning;

  try {
    return await fn();
  } finally {
    process.emitWarning = originalEmitWarning;
  }
}

async function readSqliteRowsWithBuiltin(
  dbPath: string,
  query: string,
): Promise<SqliteRow[] | null> {
  try {
    return await withSuppressedSqliteWarning(async () => {
      const sqliteModuleId = "node:sqlite";
      const sqlite = (await import(sqliteModuleId)) as {
        DatabaseSync: new (
          location: string,
        ) => {
          close(): void;
          prepare(sql: string): {
            all(): SqliteRow[];
          };
        };
      };
      const db = new sqlite.DatabaseSync(dbPath);

      try {
        return db.prepare(query).all() as SqliteRow[];
      } finally {
        db.close();
      }
    });
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    const message = (err as Error).message;
    if (
      error.code === "ERR_UNKNOWN_BUILTIN_MODULE" ||
      message.includes("node:sqlite")
    ) {
      return null;
    }

    throw err;
  }
}

function readSqliteRowsWithCli(dbPath: string, query: string): SqliteRow[] {
  const candidates = [
    process.env.TOKEN_ARENA_SQLITE3,
    "sqlite3",
    "sqlite3.exe",
  ].filter((value): value is string => Boolean(value));

  let lastError: Error | null = null;

  for (const command of candidates) {
    try {
      const output = execFileSync(command, ["-json", dbPath, query], {
        encoding: "utf-8",
        maxBuffer: 100 * 1024 * 1024,
        timeout: 30000,
        windowsHide: true,
      }).trim();

      if (!output || output === "[]") {
        return [];
      }

      return JSON.parse(output) as SqliteRow[];
    } catch (err) {
      lastError = err as Error;
      const nodeError = err as NodeJS.ErrnoException & { status?: number };
      if (nodeError.status === 127 || nodeError.message?.includes("ENOENT")) {
        continue;
      }

      throw err;
    }
  }

  throw new Error(
    `sqlite3 CLI not found. Install sqlite3 or set TOKEN_ARENA_SQLITE3 to its full path. Last error: ${lastError?.message || "not found"}`,
  );
}

export class OpenCodeParser implements IParser {
  readonly tool = TOOL;

  constructor(
    private readonly resolveRoots: () => string[] = getOpenCodeDataDirs,
  ) {}

  async parse(): Promise<ParseResult> {
    const buckets: ParseResult["buckets"] = [];
    const sessions: ParseResult["sessions"] = [];

    for (const rootDir of this.resolveRoots()) {
      const result = await this.parseRoot(rootDir);
      if (result.buckets.length > 0) {
        buckets.push(...result.buckets);
      }
      if (result.sessions.length > 0) {
        sessions.push(...result.sessions);
      }
    }

    return { buckets, sessions };
  }

  isInstalled(): boolean {
    return this.resolveRoots().some((dir) => existsSync(dir));
  }

  private async parseRoot(rootDir: string): Promise<ParseResult> {
    const dbPath = join(rootDir, "opencode.db");
    const messagesDir = join(rootDir, "storage", "message");

    if (existsSync(dbPath)) {
      try {
        return await this.parseFromSqlite(dbPath);
      } catch (err) {
        process.stderr.write(
          `warn: opencode sqlite parse failed (${(err as Error).message}), trying legacy json...\n`,
        );
      }
    }

    return this.parseFromJson(messagesDir);
  }

  private async parseFromSqlite(dbPath: string): Promise<ParseResult> {
    const query = `SELECT
      session_id as sessionID,
      json_extract(data, '$.role') as role,
      json_extract(data, '$.time.created') as created,
      json_extract(data, '$.modelID') as modelID,
      json_extract(data, '$.tokens') as tokens,
      json_extract(data, '$.path.root') as rootPath
      FROM message`;

    const builtinRows = await readSqliteRowsWithBuiltin(dbPath, query);
    const rows = builtinRows ?? readSqliteRowsWithCli(dbPath, query);

    if (rows.length === 0) {
      return { buckets: [], sessions: [] };
    }

    const entries: TokenUsageEntry[] = [];
    const sessionEvents: SessionEvent[] = [];

    for (const row of rows) {
      const timestamp = new Date(row.created);
      if (Number.isNaN(timestamp.getTime())) continue;

      const project = row.rootPath ? basename(row.rootPath) : "unknown";
      const sessionId = row.sessionID || "unknown";
      if (row.role !== "user" && row.role !== "assistant") continue;

      sessionEvents.push({
        sessionId,
        source: "opencode",
        project,
        timestamp,
        role: row.role === "user" ? "user" : "assistant",
      });

      if (!row.modelID) continue;

      let tokens: OpenCodeMessage["tokens"];
      try {
        tokens =
          typeof row.tokens === "string" ? JSON.parse(row.tokens) : row.tokens;
      } catch {
        continue;
      }
      if (!tokens || (!tokens.input && !tokens.output)) continue;

      entries.push({
        sessionId,
        source: "opencode",
        model: row.modelID || "unknown",
        project,
        timestamp,
        inputTokens: tokens.input || 0,
        outputTokens: tokens.output || 0,
        reasoningTokens: tokens.reasoning || 0,
        cachedTokens: tokens.cache?.read || 0,
      });
    }

    return {
      buckets: aggregateToBuckets(entries),
      sessions: extractSessions(sessionEvents, entries),
    };
  }

  private parseFromJson(messagesDir: string): ParseResult {
    if (!existsSync(messagesDir)) return { buckets: [], sessions: [] };

    const entries: TokenUsageEntry[] = [];
    const sessionEvents: SessionEvent[] = [];

    let sessionDirs: Dirent[];
    try {
      sessionDirs = readdirSync(messagesDir, { withFileTypes: true }).filter(
        (dirent) => dirent.isDirectory() && dirent.name.startsWith("ses_"),
      );
    } catch {
      return { buckets: [], sessions: [] };
    }

    for (const sessionDir of sessionDirs) {
      const sessionPath = join(messagesDir, sessionDir.name);
      let messageFiles: string[];
      try {
        messageFiles = readdirSync(sessionPath).filter((file) =>
          file.endsWith(".json"),
        );
      } catch {
        continue;
      }

      for (const file of messageFiles) {
        const filePath = join(sessionPath, file);

        let data: OpenCodeMessage;
        try {
          data = JSON.parse(readFileSync(filePath, "utf-8"));
        } catch {
          continue;
        }

        const timestamp = new Date(data.time?.created || data.created);
        if (Number.isNaN(timestamp.getTime())) continue;

        const rootPath = data.path?.root;
        const project = rootPath ? basename(rootPath) : "unknown";
        if (data.role !== "user" && data.role !== "assistant") continue;

        sessionEvents.push({
          sessionId: sessionDir.name,
          source: "opencode",
          project,
          timestamp,
          role: data.role === "user" ? "user" : "assistant",
        });

        if (!data.modelID) continue;
        const tokens = data.tokens;
        if (!tokens || (!tokens.input && !tokens.output)) continue;

        entries.push({
          sessionId: sessionDir.name,
          source: "opencode",
          model: data.modelID || "unknown",
          project,
          timestamp,
          inputTokens: tokens.input || 0,
          outputTokens: tokens.output || 0,
          reasoningTokens: tokens.reasoning || 0,
          cachedTokens: tokens.cache?.read || 0,
        });
      }
    }

    return {
      buckets: aggregateToBuckets(entries),
      sessions: extractSessions(sessionEvents, entries),
    };
  }
}

registerParser(new OpenCodeParser());
