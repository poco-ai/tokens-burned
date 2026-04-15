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

const TOOL_ID = "openclaw";
const TOOL_NAME = "OpenClaw";
const DEFAULT_DATA_DIR = join(homedir(), ".openclaw");
const LEGACY_ROOT_NAMES = [".clawdbot", ".moltbot", ".moldbot"];

const TOOL: ToolDefinition = {
  id: TOOL_ID,
  name: TOOL_NAME,
  dataDir: DEFAULT_DATA_DIR,
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

export function getOpenClawRoots(homeDir = homedir()): string[] {
  const roots = [join(homeDir, ".openclaw")];

  try {
    const profileRoots = readdirSync(homeDir, { withFileTypes: true })
      .filter(
        (entry) => entry.isDirectory() && /^\.openclaw-.+/.test(entry.name),
      )
      .map((entry) => join(homeDir, entry.name))
      .sort((left, right) => left.localeCompare(right));

    roots.push(...profileRoots);
  } catch {
    // Ignore unreadable home directories and fall back to well-known roots.
  }

  roots.push(...LEGACY_ROOT_NAMES.map((name) => join(homeDir, name)));

  return Array.from(new Set(roots));
}

export class OpenClawParser implements IParser {
  readonly tool = TOOL;

  constructor(
    private readonly resolveRoots: () => string[] = getOpenClawRoots,
  ) {}

  async parse(): Promise<ParseResult> {
    const entries: TokenUsageEntry[] = [];
    const sessionEvents: SessionEvent[] = [];

    for (const root of this.resolveRoots()) {
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
              if (msg.role !== "user" && msg.role !== "assistant") continue;

              sessionEvents.push({
                sessionId: filePath,
                source: TOOL_ID,
                project,
                timestamp: ts,
                role: msg.role === "user" ? "user" : "assistant",
              });

              if (msg.role !== "assistant") continue;
              const usage = msg.usage;
              if (!usage) continue;

              entries.push({
                sessionId: filePath,
                source: TOOL_ID,
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
                reasoningTokens: 0,
                cachedTokens: getTokens(
                  usage,
                  "cacheRead",
                  "cache_read",
                  "cache_read_input_tokens",
                ),
              });
            } catch {}
          }
        }
      }
    }

    return {
      buckets: aggregateToBuckets(entries),
      sessions: extractSessions(sessionEvents, entries),
    };
  }

  isInstalled(): boolean {
    return this.resolveRoots().some((root) => existsSync(join(root, "agents")));
  }
}

registerParser(new OpenClawParser());
