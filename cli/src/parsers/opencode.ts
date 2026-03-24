import { join, basename } from "node:path";
import { homedir } from "node:os";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import type { IParser, ToolDefinition } from "./types";
import type { TokenUsageEntry, SessionEvent, ParseResult } from "../domain/types";
import { aggregateToBuckets } from "../domain/aggregator";
import { extractSessions } from "../domain/session-extractor";
import { registerParser } from "./registry";

const TOOL: ToolDefinition = {
  id: "opencode",
  name: "OpenCode",
  dataDir: join(homedir(), ".local", "share", "opencode"),
};

const DB_PATH = join(TOOL.dataDir, "opencode.db");
const MESSAGES_DIR = join(TOOL.dataDir, "storage", "message");

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

class OpenCodeParser implements IParser {
  readonly tool = TOOL;

  async parse(): Promise<ParseResult> {
    // Try SQLite database first (opencode >= v0.2)
    if (existsSync(DB_PATH)) {
      try {
        return this.parseFromSqlite();
      } catch (err) {
        process.stderr.write(
          `warn: opencode sqlite parse failed (${(err as Error).message}), trying legacy json...\n`
        );
      }
    }
    // Fall back to legacy JSON files
    return this.parseFromJson();
  }

  private parseFromSqlite(): ParseResult {
    const query = `SELECT
      session_id as sessionID,
      json_extract(data, '$.role') as role,
      json_extract(data, '$.time.created') as created,
      json_extract(data, '$.modelID') as modelID,
      json_extract(data, '$.tokens') as tokens,
      json_extract(data, '$.path.root') as rootPath
      FROM message`;

    let output: string;
    try {
      output = execFileSync("sqlite3", ["-json", DB_PATH, query], {
        encoding: "utf-8",
        maxBuffer: 100 * 1024 * 1024,
        timeout: 30000,
      });
    } catch (err) {
      const nodeErr = err as NodeJS.ErrnoException & { status?: number };
      if (nodeErr.status === 127 || nodeErr.message?.includes("ENOENT")) {
        throw new Error("sqlite3 CLI not found. Install sqlite3 to sync opencode data.");
      }
      throw err;
    }

    output = output.trim();
    if (!output || output === "[]") return { buckets: [], sessions: [] };

    let rows: SqliteRow[];
    try {
      rows = JSON.parse(output);
    } catch {
      throw new Error("Failed to parse sqlite3 JSON output");
    }

    const entries: TokenUsageEntry[] = [];
    const sessionEvents: SessionEvent[] = [];

    for (const row of rows) {
      const timestamp = new Date(row.created);
      if (isNaN(timestamp.getTime())) continue;

      const project = row.rootPath ? basename(row.rootPath) : "unknown";
      const sessionId = row.sessionID || "unknown";

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
        tokens = typeof row.tokens === "string" ? JSON.parse(row.tokens) : row.tokens;
      } catch {
        continue;
      }
      if (!tokens || (!tokens.input && !tokens.output)) continue;

      entries.push({
        source: "opencode",
        model: row.modelID || "unknown",
        project,
        timestamp,
        inputTokens: tokens.input || 0,
        outputTokens: tokens.output || 0,
        cachedInputTokens: tokens.cache?.read || 0,
        reasoningOutputTokens: tokens.reasoning || 0,
      });
    }

    return {
      buckets: aggregateToBuckets(entries),
      sessions: extractSessions(sessionEvents),
    };
  }

  private parseFromJson(): ParseResult {
    if (!existsSync(MESSAGES_DIR)) return { buckets: [], sessions: [] };

    const entries: TokenUsageEntry[] = [];
    const sessionEvents: SessionEvent[] = [];

    let sessionDirs;
    try {
      sessionDirs = readdirSync(MESSAGES_DIR, { withFileTypes: true }).filter(
        (d) => d.isDirectory() && d.name.startsWith("ses_")
      );
    } catch {
      return { buckets: [], sessions: [] };
    }

    for (const sessionDir of sessionDirs) {
      const sessionPath = join(MESSAGES_DIR, sessionDir.name);
      let msgFiles: string[];
      try {
        msgFiles = readdirSync(sessionPath).filter((f) => f.endsWith(".json"));
      } catch {
        continue;
      }

      for (const file of msgFiles) {
        const filePath = join(sessionPath, file);

        let data: OpenCodeMessage;
        try {
          data = JSON.parse(readFileSync(filePath, "utf-8"));
        } catch {
          continue;
        }

        const timestamp = new Date(data.time?.created || data.created);
        if (isNaN(timestamp.getTime())) continue;

        const rootPath = data.path?.root;
        const project = rootPath ? basename(rootPath) : "unknown";

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
          source: "opencode",
          model: data.modelID || "unknown",
          project,
          timestamp,
          inputTokens: tokens.input || 0,
          outputTokens: tokens.output || 0,
          cachedInputTokens: tokens.cache?.read || 0,
          reasoningOutputTokens: tokens.reasoning || 0,
        });
      }
    }

    return {
      buckets: aggregateToBuckets(entries),
      sessions: extractSessions(sessionEvents),
    };
  }
}

registerParser(new OpenCodeParser());
