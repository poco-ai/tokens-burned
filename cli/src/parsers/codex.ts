import { homedir } from "node:os";
import { join } from "node:path";
import { aggregateToBuckets } from "../domain/aggregator";
import { extractSessions } from "../domain/session-extractor";
import type {
  ParseResult,
  SessionEvent,
  TokenUsageEntry,
} from "../domain/types";
import { findJsonlFiles, readFileSafe } from "../infrastructure/fs/utils";
import { registerParser } from "./registry";
import type { IParser, ToolDefinition } from "./types";

const TOOL: ToolDefinition = {
  id: "codex",
  name: "Codex CLI",
  dataDir: join(homedir(), ".codex", "sessions"),
};

interface CodexEvent {
  type: string;
  timestamp?: string;
  payload?: {
    type?: string;
    model?: string;
    cwd?: string;
    git?: {
      repository_url?: string;
    };
    info?: {
      model?: string;
      last_token_usage?: {
        input_tokens?: number;
        output_tokens?: number;
        cached_input_tokens?: number;
        reasoning_output_tokens?: number;
      };
      total_token_usage?: {
        input_tokens?: number;
        output_tokens?: number;
        cached_input_tokens?: number;
        reasoning_output_tokens?: number;
      };
    };
  };
}

function getPathLeaf(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/\/+$/, "");
  const leaf = normalized.split("/").filter(Boolean).pop();
  return leaf || "unknown";
}

export function resolveCodexProject(payload?: CodexEvent["payload"]): string {
  if (!payload) {
    return "unknown";
  }

  const repositoryUrl = payload.git?.repository_url;
  if (repositoryUrl) {
    const match = repositoryUrl.match(/([^/]+\/[^/]+?)(?:\.git)?$/);
    if (match) {
      return match[1];
    }
  }

  if (payload.cwd) {
    return getPathLeaf(payload.cwd);
  }

  return "unknown";
}

class CodexParser implements IParser {
  readonly tool = TOOL;

  async parse(): Promise<ParseResult> {
    const entries: TokenUsageEntry[] = [];
    const sessionEvents: SessionEvent[] = [];
    const files = findJsonlFiles(TOOL.dataDir);

    if (files.length === 0) {
      return { buckets: [], sessions: [] };
    }

    for (const filePath of files) {
      const content = readFileSafe(filePath);
      if (!content) continue;

      let sessionProject = "unknown";
      const sessionModel = "unknown";
      for (const line of content.split("\n")) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line) as CodexEvent;
          if (obj.type === "session_meta") {
            sessionProject = resolveCodexProject(obj.payload);
            break;
          }
        } catch {
          break;
        }
      }

      let turnContextModel = "unknown";
      type TokenUsage = {
        input_tokens?: number;
        output_tokens?: number;
        cached_input_tokens?: number;
        reasoning_output_tokens?: number;
      };
      const prevTotal = new Map<string, TokenUsage>();

      for (const line of content.split("\n")) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line) as CodexEvent;

          if (obj.type === "turn_context" && obj.timestamp) {
            const eventTimestamp = new Date(obj.timestamp);
            if (!Number.isNaN(eventTimestamp.getTime())) {
              sessionEvents.push({
                sessionId: filePath,
                source: "codex",
                project: sessionProject,
                timestamp: eventTimestamp,
                role: "user",
              });
            }
          }

          if (obj.type === "turn_context" && obj.payload?.model) {
            turnContextModel = obj.payload.model;
            continue;
          }

          if (obj.type !== "event_msg") continue;

          const payload = obj.payload;
          if (!payload || payload.type !== "token_count") continue;

          const info = payload.info;
          if (!info) continue;

          const timestamp = obj.timestamp ? new Date(obj.timestamp) : null;
          if (!timestamp || Number.isNaN(timestamp.getTime())) continue;

          sessionEvents.push({
            sessionId: filePath,
            source: "codex",
            project: sessionProject,
            timestamp,
            role: "assistant",
          });

          let usage = info.last_token_usage;
          if (!usage && info.total_token_usage) {
            const totalKey = `${info.model || payload.model || turnContextModel || ""}`;
            const prev = prevTotal.get(totalKey);
            const curr = info.total_token_usage;
            if (prev) {
              usage = {
                input_tokens:
                  (curr.input_tokens || 0) - (prev.input_tokens || 0),
                output_tokens:
                  (curr.output_tokens || 0) - (prev.output_tokens || 0),
                cached_input_tokens:
                  (curr.cached_input_tokens || 0) -
                  (prev.cached_input_tokens || 0),
                reasoning_output_tokens:
                  (curr.reasoning_output_tokens || 0) -
                  (prev.reasoning_output_tokens || 0),
              };
            } else {
              usage = curr;
            }
            prevTotal.set(totalKey, { ...curr });
          }
          if (!usage) continue;

          const model =
            info.model || payload.model || turnContextModel || sessionModel;
          const cachedInput = usage.cached_input_tokens || 0;
          const reasoningTokens = usage.reasoning_output_tokens || 0;

          entries.push({
            sessionId: filePath,
            source: "codex",
            model,
            project: sessionProject,
            timestamp,
            inputTokens: (usage.input_tokens || 0) - cachedInput,
            outputTokens: usage.output_tokens || 0,
            reasoningTokens,
            cachedTokens: cachedInput,
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
}

registerParser(new CodexParser());
