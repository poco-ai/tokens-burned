import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { aggregateToBuckets } from "../domain/aggregator";
import { extractSessions } from "../domain/session-extractor";
import type {
  ParseResult,
  SessionEvent,
  TokenUsageEntry,
} from "../domain/types";
import { registerParser } from "./registry";
import type { IParser, ToolDefinition } from "./types";

const TOOL_ID = "hermes";
const TOOL_NAME = "Hermes Agent";
const DEFAULT_DB_PATH = join(homedir(), ".hermes", "state.db");

const SESSIONS_QUERY = `SELECT
  id,
  model,
  started_at as startedAt,
  input_tokens as inputTokens,
  output_tokens as outputTokens,
  cache_read_tokens as cacheReadTokens,
  reasoning_tokens as reasoningTokens
  FROM sessions
  WHERE input_tokens > 0
    OR output_tokens > 0
    OR cache_read_tokens > 0
    OR reasoning_tokens > 0`;

const MESSAGES_QUERY = `SELECT
  session_id as sessionId,
  role,
  timestamp
  FROM messages
  WHERE role IN ('user', 'assistant')
  ORDER BY timestamp`;

interface HermesSessionRow {
  id?: unknown;
  model?: unknown;
  startedAt?: unknown;
  inputTokens?: unknown;
  outputTokens?: unknown;
  cacheReadTokens?: unknown;
  reasoningTokens?: unknown;
}

interface HermesMessageRow {
  sessionId?: unknown;
  role?: unknown;
  timestamp?: unknown;
}

type SqliteQueryRows = <TRow>(dbPath: string, query: string) => Promise<TRow[]>;

export interface HermesParserOptions {
  dbPath?: string;
  queryRows?: SqliteQueryRows;
}

function createToolDefinition(dbPath: string): ToolDefinition {
  return {
    id: TOOL_ID,
    name: TOOL_NAME,
    dataDir: dirname(dbPath),
  };
}

function toSafeNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function parseUnixTimestamp(value: unknown): Date | null {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return null;
  }

  const timestamp = new Date(numberValue * 1000);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp;
}

function withSuppressedSqliteWarning<T>(fn: () => Promise<T>): Promise<T> {
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

  return fn().finally(() => {
    process.emitWarning = originalEmitWarning;
  });
}

async function readSqliteRowsWithBuiltin<TRow>(
  dbPath: string,
  query: string,
): Promise<TRow[] | null> {
  try {
    return await withSuppressedSqliteWarning(async () => {
      const sqliteModuleId = "node:sqlite";
      const sqlite = (await import(sqliteModuleId)) as {
        DatabaseSync: new (
          location: string,
        ) => {
          close(): void;
          prepare(sql: string): {
            all(): TRow[];
          };
        };
      };
      const db = new sqlite.DatabaseSync(dbPath);

      try {
        return db.prepare(query).all() as TRow[];
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

function readSqliteRowsWithCli<TRow>(dbPath: string, query: string): TRow[] {
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

      return JSON.parse(output) as TRow[];
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

async function readSqliteRows<TRow>(
  dbPath: string,
  query: string,
): Promise<TRow[]> {
  const builtinRows = await readSqliteRowsWithBuiltin<TRow>(dbPath, query);
  return builtinRows ?? readSqliteRowsWithCli<TRow>(dbPath, query);
}

export class HermesParser implements IParser {
  readonly tool: ToolDefinition;
  private readonly dbPath: string;
  private readonly queryRows: SqliteQueryRows;

  constructor(options: HermesParserOptions = {}) {
    this.dbPath = options.dbPath || DEFAULT_DB_PATH;
    this.queryRows = options.queryRows || readSqliteRows;
    this.tool = createToolDefinition(this.dbPath);
  }

  async parse(): Promise<ParseResult> {
    if (!existsSync(this.dbPath)) {
      return { buckets: [], sessions: [] };
    }

    const sessionRows = await this.queryRows<HermesSessionRow>(
      this.dbPath,
      SESSIONS_QUERY,
    );

    const entries: TokenUsageEntry[] = [];
    for (const row of sessionRows) {
      const sessionId =
        typeof row.id === "string" && row.id.length > 0 ? row.id : null;
      if (!sessionId) continue;

      const timestamp = parseUnixTimestamp(row.startedAt);
      if (!timestamp) continue;

      const inputTokens = toSafeNumber(row.inputTokens);
      const outputTokens = toSafeNumber(row.outputTokens);
      const cachedTokens = toSafeNumber(row.cacheReadTokens);
      const reasoningTokens = toSafeNumber(row.reasoningTokens);

      if (
        inputTokens === 0 &&
        outputTokens === 0 &&
        cachedTokens === 0 &&
        reasoningTokens === 0
      ) {
        continue;
      }

      entries.push({
        sessionId,
        source: TOOL_ID,
        model:
          typeof row.model === "string" && row.model.length > 0
            ? row.model
            : "unknown",
        project: "unknown",
        timestamp,
        inputTokens,
        outputTokens,
        reasoningTokens,
        cachedTokens,
      });
    }

    let messageRows: HermesMessageRow[];
    try {
      messageRows = await this.queryRows<HermesMessageRow>(
        this.dbPath,
        MESSAGES_QUERY,
      );
    } catch {
      return {
        buckets: aggregateToBuckets(entries),
        sessions: [],
      };
    }

    const sessionEvents: SessionEvent[] = [];
    for (const row of messageRows) {
      const sessionId =
        typeof row.sessionId === "string" && row.sessionId.length > 0
          ? row.sessionId
          : null;
      if (!sessionId) continue;

      const role =
        row.role === "user" || row.role === "assistant" ? row.role : null;
      if (!role) continue;

      const timestamp = parseUnixTimestamp(row.timestamp);
      if (!timestamp) continue;

      sessionEvents.push({
        sessionId,
        source: TOOL_ID,
        project: "unknown",
        timestamp,
        role,
      });
    }

    return {
      buckets: aggregateToBuckets(entries),
      sessions: extractSessions(sessionEvents, entries),
    };
  }

  isInstalled(): boolean {
    return existsSync(this.dbPath);
  }
}

registerParser(new HermesParser());
