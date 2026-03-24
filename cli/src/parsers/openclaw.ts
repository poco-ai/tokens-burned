import { type Dirent, existsSync, readdirSync, readFileSync } from "node:fs";
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

const POSSIBLE_ROOTS = [
  join(homedir(), ".openclaw"),
  join(homedir(), ".clawdbot"),
  join(homedir(), ".moltbot"),
  join(homedir(), ".moldbot"),
];

const TOOL: ToolDefinition = {
  id: "openclaw",
  name: "OpenClaw",
  dataDir: POSSIBLE_ROOTS[0], // Primary data dir for detection
};

interface OpenClawMessage {
  type?: string;
  timestamp?: string | number;
  message?: {
    role?: string;
    timestamp?: string | number;
    model?: string;
    usage?: {
      input?: number;
      inputTokens?: number;
      input_tokens?: number;
      promptTokens?: number;
      prompt_tokens?: number;
      output?: number;
      outputTokens?: number;
      output_tokens?: number;
      completionTokens?: number;
      completion_tokens?: number;
      cacheRead?: number;
      cache_read?: number;
      cache_read_input_tokens?: number;
    };
  };
  model?: string;
}

/** Normalize usage fields — OpenClaw supports multiple naming conventions */
function getTokens(
  usage: NonNullable<OpenClawMessage["message"]>["usage"],
  ...keys: string[]
): number {
  for (const key of keys) {
    const value = (usage as Record<string, unknown>)[key];
    if (typeof value === "number" && value > 0) return value;
  }
  return 0;
}

class OpenClawParser implements IParser {
  readonly tool = TOOL;

  async parse(): Promise<ParseResult> {
    const entries: TokenUsageEntry[] = [];
    const sessionEvents: SessionEvent[] = [];

    for (const root of POSSIBLE_ROOTS) {
      const agentsDir = join(root, "agents");
      if (!existsSync(agentsDir)) continue;

      let agentDirs: Dirent[];
      try {
        agentDirs = readdirSync(agentsDir, { withFileTypes: true }).filter(
          (d) => d.isDirectory(),
        );
      } catch {
        continue;
      }

      for (const agentDir of agentDirs) {
        const project = agentDir.name;
        const sessionsDir = join(agentsDir, agentDir.name, "sessions");
        if (!existsSync(sessionsDir)) continue;

        let files: string[];
        try {
          files = readdirSync(sessionsDir).filter((f) => f.endsWith(".jsonl"));
        } catch {
          continue;
        }

        for (const file of files) {
          const filePath = join(sessionsDir, file);

          let content: string;
          try {
            content = readFileSync(filePath, "utf-8");
          } catch {
            continue;
          }

          for (const line of content.split("\n")) {
            if (!line.trim()) continue;
            try {
              const obj = JSON.parse(line) as OpenClawMessage;

              if (obj.type !== "message") continue;
              const msg = obj.message;
              if (!msg) continue;

              const timestamp = obj.timestamp || msg.timestamp;
              if (!timestamp) continue;
              const ts = new Date(
                typeof timestamp === "number" ? timestamp : timestamp,
              );
              if (Number.isNaN(ts.getTime())) continue;

              sessionEvents.push({
                sessionId: filePath,
                source: "openclaw",
                project,
                timestamp: ts,
                role: msg.role === "user" ? "user" : "assistant",
              });

              if (msg.role !== "assistant") continue;
              const usage = msg.usage;
              if (!usage) continue;

              entries.push({
                source: "openclaw",
                model: msg.model || obj.model || "unknown",
                project,
                timestamp: ts,
                inputTokens: getTokens(
                  usage,
                  "input",
                  "inputTokens",
                  "input_tokens",
                  "promptTokens",
                  "prompt_tokens",
                ),
                outputTokens: getTokens(
                  usage,
                  "output",
                  "outputTokens",
                  "output_tokens",
                  "completionTokens",
                  "completion_tokens",
                ),
                cachedInputTokens: getTokens(
                  usage,
                  "cacheRead",
                  "cache_read",
                  "cache_read_input_tokens",
                ),
                reasoningOutputTokens: 0,
              });
            } catch {}
          }
        }
      }
    }

    return {
      buckets: aggregateToBuckets(entries),
      sessions: extractSessions(sessionEvents),
    };
  }

  /** Check if any of the possible roots exist */
  isInstalled(): boolean {
    return POSSIBLE_ROOTS.some((root) => existsSync(join(root, "agents")));
  }
}

registerParser(new OpenClawParser());
