import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { aggregateToBuckets } from "../domain/aggregator";
import { extractSessions } from "../domain/session-extractor";
import type {
  ParseResult,
  SessionEvent,
  TokenUsageEntry,
} from "../domain/types";
import { registerParser } from "./registry";
import type { IParser, ToolDefinition } from "./types";

const ROOT_DIR = join(homedir(), ".copilot");

const TOOL: ToolDefinition = {
  id: "copilot-cli",
  name: "GitHub Copilot CLI",
  dataDir: ROOT_DIR,
};

interface CopilotEvent {
  type: string;
  timestamp?: string;
  data?: {
    context?: {
      gitRoot?: string;
      cwd?: string;
    };
    modelMetrics?: Record<
      string,
      {
        usage?: {
          inputTokens?: number;
          outputTokens?: number;
          cacheReadTokens?: number;
          cacheWriteTokens?: number;
        };
      }
    >;
  };
}

function collectEventFiles(
  dir: string,
  results: { filePath: string; sessionId: string }[],
  visited: Set<string>,
): void {
  if (!existsSync(dir) || visited.has(dir)) {
    return;
  }

  visited.add(dir);

  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        collectEventFiles(fullPath, results, visited);
        continue;
      }

      if (entry.isFile() && entry.name === "events.jsonl") {
        results.push({
          filePath: fullPath,
          sessionId: basename(dirname(fullPath)),
        });
      }
    }
  } catch {
    // Ignore unreadable directories and keep scanning.
  }
}

function findEventFiles(
  baseDir: string,
): { filePath: string; sessionId: string }[] {
  const results: { filePath: string; sessionId: string }[] = [];
  collectEventFiles(baseDir, results, new Set<string>());
  return results;
}

function getProjectFromContext(
  context: { gitRoot?: string; cwd?: string } | undefined,
): string {
  const projectPath = context?.gitRoot || context?.cwd;
  if (!projectPath) return "unknown";
  return basename(projectPath.replace(/[\\/]+$/, "")) || "unknown";
}

class CopilotCliParser implements IParser {
  readonly tool = TOOL;

  async parse(): Promise<ParseResult> {
    const eventFiles = findEventFiles(ROOT_DIR);
    if (eventFiles.length === 0) {
      return { buckets: [], sessions: [] };
    }

    const entries: TokenUsageEntry[] = [];
    const sessionEvents: SessionEvent[] = [];

    for (const { filePath, sessionId } of eventFiles) {
      let content: string;
      try {
        content = readFileSync(filePath, "utf-8");
      } catch {
        continue;
      }

      let currentProject = "unknown";

      for (const line of content.split("\n")) {
        if (!line.trim()) continue;

        try {
          const obj = JSON.parse(line) as CopilotEvent;
          const timestamp = obj.timestamp ? new Date(obj.timestamp) : null;
          const hasTimestamp = timestamp && !Number.isNaN(timestamp.getTime());

          if (obj.type === "session.start" || obj.type === "session.resume") {
            currentProject = getProjectFromContext(obj.data?.context);
          }

          if (hasTimestamp && timestamp && obj.type === "user.message") {
            sessionEvents.push({
              sessionId,
              source: "copilot-cli",
              project: currentProject,
              timestamp,
              role: "user",
            });
          }

          if (hasTimestamp && timestamp && obj.type === "assistant.message") {
            sessionEvents.push({
              sessionId,
              source: "copilot-cli",
              project: currentProject,
              timestamp,
              role: "assistant",
            });
          }

          if (obj.type !== "session.shutdown" || !hasTimestamp || !timestamp) {
            continue;
          }

          const modelMetrics = obj.data?.modelMetrics || {};
          for (const [model, metrics] of Object.entries(modelMetrics)) {
            const usage = metrics?.usage;
            if (!usage) continue;

            const totalInput = usage.inputTokens || 0;
            const cachedRead = usage.cacheReadTokens || 0;
            const output = usage.outputTokens || 0;

            if (totalInput === 0 && cachedRead === 0 && output === 0) {
              continue;
            }

            entries.push({
              sessionId,
              source: "copilot-cli",
              model,
              project: currentProject,
              timestamp,
              inputTokens: Math.max(0, totalInput - cachedRead),
              outputTokens: output,
              reasoningTokens: 0,
              cachedTokens: cachedRead,
            });
          }
        } catch {
          // Ignore malformed lines and continue scanning the event log.
        }
      }
    }

    return {
      buckets: aggregateToBuckets(entries),
      sessions: extractSessions(sessionEvents, entries),
    };
  }

  isInstalled(): boolean {
    return existsSync(ROOT_DIR);
  }
}

registerParser(new CopilotCliParser());
