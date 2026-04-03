import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { aggregateToBuckets } from "../domain/aggregator";
import { extractSessions } from "../domain/session-extractor";
import type {
  ParseResult,
  SessionEvent,
  TokenUsageEntry,
} from "../domain/types";
import {
  findJsonlFiles,
  parseJsonl,
  readFileSafe,
} from "../infrastructure/fs/utils";
import { registerParser } from "./registry";
import type { IParser, ToolDefinition } from "./types";

const TOOL_ID = "pi-coding-agent";
const TOOL_NAME = "pi";
const DEFAULT_SESSIONS_DIR = join(homedir(), ".pi", "agent", "sessions");

interface PiUsage {
  input?: number;
  inputTokens?: number;
  output?: number;
  outputTokens?: number;
  cacheRead?: number;
  cacheReadTokens?: number;
  cache_read?: number;
  reasoningOutputTokens?: number;
  thinkingTokens?: number;
  thoughts?: number;
}

interface PiEvent {
  type?: string;
  id?: string;
  timestamp?: string;
  cwd?: string;
  message?: {
    role?: string;
    timestamp?: string;
    model?: string;
    usage?: PiUsage;
  };
}

function createToolDefinition(dataDir: string): ToolDefinition {
  return {
    id: TOOL_ID,
    name: TOOL_NAME,
    dataDir,
  };
}

function toSafeNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getPathLeaf(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/\/+$/, "");
  const leaf = normalized.split("/").filter(Boolean).pop();
  return leaf || "unknown";
}

function normalizeForPrefix(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/+$/, "");
}

function getUsageNumber(usage: PiUsage, ...keys: Array<keyof PiUsage>): number {
  for (const key of keys) {
    const value = usage[key];
    const numberValue = toSafeNumber(value);
    if (numberValue > 0) {
      return numberValue;
    }
  }

  return 0;
}

export function extractPiProjectFromCwd(cwd: string): string {
  return getPathLeaf(cwd);
}

export function extractPiProjectFromDir(
  filePath: string,
  sessionsDir = DEFAULT_SESSIONS_DIR,
): string {
  const normalizedFilePath = normalizeForPrefix(filePath);
  const normalizedSessionsDir = normalizeForPrefix(sessionsDir);
  const prefix = `${normalizedSessionsDir}/`;

  if (!normalizedFilePath.startsWith(prefix)) {
    return "unknown";
  }

  const relativePath = normalizedFilePath.slice(prefix.length);
  const firstSegment = relativePath.split("/")[0];
  if (!firstSegment) {
    return "unknown";
  }

  try {
    const decoded = decodeURIComponent(firstSegment);
    if (decoded.includes("/") || decoded.includes("\\")) {
      return getPathLeaf(decoded);
    }
  } catch {
    // Fall back to slug parsing when the segment is not URI-encoded.
  }

  const slugParts = firstSegment.split("-").filter(Boolean);
  return slugParts.length > 0 ? slugParts[slugParts.length - 1] : "unknown";
}

export class PiCodingAgentParser implements IParser {
  readonly tool: ToolDefinition;

  constructor(private readonly sessionsDir = DEFAULT_SESSIONS_DIR) {
    this.tool = createToolDefinition(sessionsDir);
  }

  async parse(): Promise<ParseResult> {
    const sessionFiles = findJsonlFiles(this.sessionsDir);
    if (sessionFiles.length === 0) {
      return { buckets: [], sessions: [] };
    }

    const entries: TokenUsageEntry[] = [];
    const sessionEvents: SessionEvent[] = [];
    const seenEntryIds = new Set<string>();

    for (const filePath of sessionFiles) {
      const content = readFileSafe(filePath);
      if (!content) continue;

      const rows = parseJsonl<PiEvent>(content);
      if (rows.length === 0) continue;

      let sessionId = filePath;
      let project = extractPiProjectFromDir(filePath, this.sessionsDir);

      for (const row of rows) {
        if (row.type !== "session") continue;
        if (row.id) {
          sessionId = row.id;
        }
        if (row.cwd) {
          project = extractPiProjectFromCwd(row.cwd);
        }
        break;
      }

      for (const row of rows) {
        if (row.type !== "message") continue;

        const message = row.message;
        if (!message) continue;

        const rawTimestamp = row.timestamp || message.timestamp;
        if (!rawTimestamp) continue;

        const timestamp = new Date(rawTimestamp);
        if (Number.isNaN(timestamp.getTime())) continue;

        if (message.role === "user" || message.role === "assistant") {
          sessionEvents.push({
            sessionId,
            source: TOOL_ID,
            project,
            timestamp,
            role: message.role,
          });
        }

        if (message.role !== "assistant") continue;

        const usage = message.usage;
        if (!usage) continue;

        const inputTokens = getUsageNumber(usage, "input", "inputTokens");
        const outputTokens = getUsageNumber(usage, "output", "outputTokens");
        const cachedTokens = getUsageNumber(
          usage,
          "cacheRead",
          "cacheReadTokens",
          "cache_read",
        );
        const reasoningTokens = getUsageNumber(
          usage,
          "reasoningOutputTokens",
          "thinkingTokens",
          "thoughts",
        );

        if (
          inputTokens === 0 &&
          outputTokens === 0 &&
          cachedTokens === 0 &&
          reasoningTokens === 0
        ) {
          continue;
        }

        if (row.id) {
          if (seenEntryIds.has(row.id)) continue;
          seenEntryIds.add(row.id);
        }

        entries.push({
          sessionId,
          source: TOOL_ID,
          model: message.model || "unknown",
          project,
          timestamp,
          inputTokens,
          outputTokens,
          reasoningTokens,
          cachedTokens,
        });
      }
    }

    return {
      buckets: aggregateToBuckets(entries),
      sessions: extractSessions(sessionEvents, entries),
    };
  }

  isInstalled(): boolean {
    return existsSync(this.sessionsDir);
  }
}

registerParser(new PiCodingAgentParser());
