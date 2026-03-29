import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
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
  id: "copilot-cli",
  name: "GitHub Copilot CLI",
  dataDir: join(homedir(), ".copilot", "session-state"),
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

function findEventFiles(
  baseDir: string,
): { filePath: string; sessionId: string }[] {
  const results: { filePath: string; sessionId: string }[] = [];
  if (!existsSync(baseDir)) return results;

  try {
    for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const eventsFile = join(baseDir, entry.name, "events.jsonl");
      if (existsSync(eventsFile)) {
        results.push({ filePath: eventsFile, sessionId: entry.name });
      }
    }
  } catch {
    return results;
  }

  return results;
}

function getProjectFromContext(
  context: { gitRoot?: string; cwd?: string } | undefined,
): string {
  const projectPath = context?.gitRoot || context?.cwd;
  if (!projectPath) return "unknown";
  return basename(projectPath) || "unknown";
}

class CopilotCliParser implements IParser {
  readonly tool = TOOL;

  async parse(): Promise<ParseResult> {
    const eventFiles = findEventFiles(TOOL.dataDir);
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

          if (obj.type !== "session.shutdown" || !hasTimestamp || !timestamp)
            continue;

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
        } catch {}
      }
    }

    return {
      buckets: aggregateToBuckets(entries),
      sessions: extractSessions(sessionEvents, entries),
    };
  }
}

registerParser(new CopilotCliParser());
