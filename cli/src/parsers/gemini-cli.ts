import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { aggregateToBuckets } from "../domain/aggregator";
import { extractSessions } from "../domain/session-extractor";
import type {
  ParseResult,
  SessionEvent,
  TokenUsageEntry,
} from "../domain/types";
import { registerParser } from "./registry";
import type { IParser, ToolDefinition } from "./types";

const TOOL: ToolDefinition = {
  id: "gemini-cli",
  name: "Gemini CLI",
  dataDir: join(homedir(), ".gemini", "tmp"),
};

function findSessionFiles(baseDir: string): string[] {
  const results: string[] = [];
  if (!existsSync(baseDir)) return results;

  try {
    for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const chatsDir = join(baseDir, entry.name, "chats");
      if (!existsSync(chatsDir)) continue;
      try {
        for (const f of readdirSync(chatsDir)) {
          if (f.startsWith("session-") && f.endsWith(".json")) {
            results.push(join(chatsDir, f));
          }
        }
      } catch {}
    }
  } catch {
    return results;
  }
  return results;
}

interface GeminiMessage {
  role: string;
  timestamp?: string;
  createTime?: string;
  model?: string;
  tokens?: {
    input?: number;
    output?: number;
    cached?: number;
    thoughts?: number;
  };
  usage?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
    thoughtsTokenCount?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
  usageMetadata?: GeminiMessage["usage"];
  token_count?: GeminiMessage["usage"];
}

interface GeminiSession {
  messages?: GeminiMessage[];
  history?: GeminiMessage[];
  model?: string;
  createTime?: string;
}

class GeminiCliParser implements IParser {
  readonly tool = TOOL;

  async parse(): Promise<ParseResult> {
    const sessionFiles = findSessionFiles(TOOL.dataDir);
    if (sessionFiles.length === 0) {
      return { buckets: [], sessions: [] };
    }

    const entries: TokenUsageEntry[] = [];
    const sessionEvents: SessionEvent[] = [];

    for (const filePath of sessionFiles) {
      let data: GeminiSession;
      try {
        data = JSON.parse(readFileSync(filePath, "utf-8"));
      } catch {
        continue;
      }

      const messages = data.messages || data.history || [];
      for (const msg of messages) {
        const timestamp = msg.timestamp || msg.createTime || data.createTime;
        if (!timestamp) continue;
        const ts = new Date(timestamp);
        if (Number.isNaN(ts.getTime())) continue;

        if (msg.role !== "user" && msg.role !== "assistant") continue;

        const role = msg.role;
        sessionEvents.push({
          sessionId: filePath,
          source: "gemini-cli",
          project: "unknown",
          timestamp: ts,
          role,
        });

        const tokens = msg.tokens;
        const usage = msg.usage || msg.usageMetadata || msg.token_count;
        if (!tokens && !usage) continue;

        if (tokens) {
          const cached = tokens.cached || 0;
          const thoughts = tokens.thoughts || 0;
          entries.push({
            sessionId: filePath,
            source: "gemini-cli",
            model: msg.model || data.model || "unknown",
            project: "unknown",
            timestamp: ts,
            inputTokens: (tokens.input || 0) - cached,
            outputTokens: tokens.output || 0,
            reasoningTokens: thoughts,
            cachedTokens: cached,
          });
        } else if (usage) {
          const cached = usage.cachedContentTokenCount || 0;
          const thoughts = usage.thoughtsTokenCount || 0;
          entries.push({
            sessionId: filePath,
            source: "gemini-cli",
            model: msg.model || data.model || "unknown",
            project: "unknown",
            timestamp: ts,
            inputTokens:
              (usage.promptTokenCount || usage.input_tokens || 0) - cached,
            outputTokens:
              usage.candidatesTokenCount || usage.output_tokens || 0,
            reasoningTokens: thoughts,
            cachedTokens: cached,
          });
        }
      }
    }

    return {
      buckets: aggregateToBuckets(entries),
      sessions: extractSessions(sessionEvents, entries),
    };
  }
}

registerParser(new GeminiCliParser());
