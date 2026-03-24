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

      // Extract project name and model from session_meta line
      let sessionProject = "unknown";
      const sessionModel = "unknown";
      for (const line of content.split("\n")) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line) as CodexEvent;
          if (obj.type === "session_meta" && obj.payload) {
            const meta = obj.payload;
            if (meta.cwd) {
              sessionProject = meta.cwd.split("/").pop() || "unknown";
            }
            if (meta.git?.repository_url) {
              const match = meta.git.repository_url.match(
                /([^/]+\/[^/]+?)(?:\.git)?$/,
              );
              if (match) sessionProject = match[1];
            }
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

          if (obj.timestamp) {
            const evTs = new Date(obj.timestamp);
            if (!Number.isNaN(evTs.getTime())) {
              const isUserTurn =
                obj.type === "turn_context" || obj.type === "session_meta";
              sessionEvents.push({
                sessionId: filePath,
                source: "codex",
                project: sessionProject,
                timestamp: evTs,
                role: isUserTurn ? "user" : "assistant",
              });
            }
          }

          if (obj.type === "turn_context" && obj.payload?.model) {
            turnContextModel = obj.payload.model;
            continue;
          }

          if (obj.type !== "event_msg") continue;

          const payload = obj.payload;
          if (!payload) continue;

          if (payload.type !== "token_count") continue;

          const info = payload.info;
          if (!info) continue;

          const timestamp = obj.timestamp ? new Date(obj.timestamp) : null;
          if (!timestamp || Number.isNaN(timestamp.getTime())) continue;

          // Prefer incremental per-request usage; compute delta from cumulative total as fallback
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

          // OpenAI API: input_tokens INCLUDES cached, output_tokens INCLUDES reasoning.
          // Normalize to Anthropic-style semantics where each field is non-overlapping.
          const cachedInput = usage.cached_input_tokens || 0;
          const reasoningOutput = usage.reasoning_output_tokens || 0;

          entries.push({
            source: "codex",
            model,
            project: sessionProject,
            timestamp,
            inputTokens: (usage.input_tokens || 0) - cachedInput,
            outputTokens: (usage.output_tokens || 0) - reasoningOutput,
            cachedInputTokens: cachedInput,
            reasoningOutputTokens: reasoningOutput,
          });
        } catch {}
      }
    }

    return {
      buckets: aggregateToBuckets(entries),
      sessions: extractSessions(sessionEvents),
    };
  }
}

registerParser(new CodexParser());
