import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { aggregateToBuckets } from "../domain/aggregator";
import { extractSessions } from "../domain/session-extractor";
import type {
  ParseResult,
  SessionEvent,
  TokenUsageEntry,
} from "../domain/types";
import { readFileSafe } from "../infrastructure/fs/utils";
import { registerParser } from "./registry";
import type { IParser, ToolDefinition } from "./types";

const TOOL_ID = "qwen-code";
const TOOL_NAME = "Qwen Code";
const DEFAULT_DATA_DIR = join(homedir(), ".qwen", "tmp");

interface QwenUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  cachedContentTokenCount?: number;
  thoughtsTokenCount?: number;
  input_tokens?: number;
  output_tokens?: number;
}

interface QwenEvent {
  type?: string;
  timestamp?: string;
  cwd?: string;
  uuid?: string;
  model?: string;
  usageMetadata?: QwenUsage;
  usage?: QwenUsage;
}

export interface QwenCodeParserOptions {
  dataDir?: string;
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

function findSessionFiles(baseDir: string): string[] {
  const results: string[] = [];
  if (!existsSync(baseDir)) return results;

  try {
    for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const chatsDir = join(baseDir, entry.name, "chats");
      if (!existsSync(chatsDir)) continue;

      try {
        for (const file of readdirSync(chatsDir)) {
          if (file.endsWith(".jsonl")) {
            results.push(join(chatsDir, file));
          }
        }
      } catch {
        // Ignore unreadable chat directories and keep scanning.
      }
    }
  } catch {
    return results;
  }

  return results;
}

export function resolveQwenProject(
  cwd: string | undefined,
  filePath: string,
  dataDir = DEFAULT_DATA_DIR,
): string {
  if (cwd) {
    return getPathLeaf(cwd);
  }

  const normalizedFilePath = normalizeForPrefix(filePath);
  const normalizedDataDir = normalizeForPrefix(dataDir);
  const prefix = `${normalizedDataDir}/`;

  if (!normalizedFilePath.startsWith(prefix)) {
    return "unknown";
  }

  const relativePath = normalizedFilePath.slice(prefix.length);
  const projectId = relativePath.split("/")[0];
  return projectId || "unknown";
}

export class QwenCodeParser implements IParser {
  readonly tool: ToolDefinition;

  constructor(private readonly dataDir = DEFAULT_DATA_DIR) {
    this.tool = createToolDefinition(dataDir);
  }

  async parse(): Promise<ParseResult> {
    const sessionFiles = findSessionFiles(this.dataDir);
    if (sessionFiles.length === 0) {
      return { buckets: [], sessions: [] };
    }

    const entries: TokenUsageEntry[] = [];
    const sessionEvents: SessionEvent[] = [];
    const seenUuids = new Set<string>();

    for (const filePath of sessionFiles) {
      const content = readFileSafe(filePath);
      if (!content) continue;

      const sessionId = filePath;

      for (const line of content.split("\n")) {
        if (!line.trim()) continue;

        try {
          const obj = JSON.parse(line) as QwenEvent;
          if (!obj.timestamp) continue;

          const timestamp = new Date(obj.timestamp);
          if (Number.isNaN(timestamp.getTime())) continue;

          const project = resolveQwenProject(obj.cwd, filePath, this.dataDir);

          if (obj.type === "user" || obj.type === "assistant") {
            sessionEvents.push({
              sessionId,
              source: TOOL_ID,
              project,
              timestamp,
              role: obj.type,
            });
          }

          if (obj.type !== "assistant") continue;

          const usage = obj.usageMetadata || obj.usage;
          if (!usage) continue;

          const totalInput =
            toSafeNumber(usage.promptTokenCount) ||
            toSafeNumber(usage.input_tokens);
          const totalOutput =
            toSafeNumber(usage.candidatesTokenCount) ||
            toSafeNumber(usage.output_tokens);
          const cachedTokens = toSafeNumber(usage.cachedContentTokenCount);
          const reasoningTokens = toSafeNumber(usage.thoughtsTokenCount);

          if (
            totalInput === 0 &&
            totalOutput === 0 &&
            cachedTokens === 0 &&
            reasoningTokens === 0
          ) {
            continue;
          }

          if (obj.uuid) {
            if (seenUuids.has(obj.uuid)) continue;
            seenUuids.add(obj.uuid);
          }

          entries.push({
            sessionId,
            source: TOOL_ID,
            model: obj.model || "unknown",
            project,
            timestamp,
            inputTokens: Math.max(0, totalInput - cachedTokens),
            outputTokens: Math.max(0, totalOutput - reasoningTokens),
            reasoningTokens,
            cachedTokens,
          });
        } catch {
          // Ignore malformed lines and continue scanning the session log.
        }
      }
    }

    return {
      buckets: aggregateToBuckets(entries),
      sessions: extractSessions(sessionEvents, entries),
    };
  }

  isInstalled(): boolean {
    return existsSync(this.dataDir);
  }
}

registerParser(new QwenCodeParser());
