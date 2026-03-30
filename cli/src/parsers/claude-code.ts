import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, sep } from "node:path";
import { aggregateToBuckets } from "../domain/aggregator";
import { extractSessions } from "../domain/session-extractor";
import type {
  ParseResult,
  SessionEvent,
  TokenUsageEntry,
} from "../domain/types";
import {
  extractSessionId,
  findJsonlFiles,
  readFileSafe,
} from "../infrastructure/fs/utils";
import { registerParser } from "./registry";
import type { IParser, ToolDefinition } from "./types";

const TOOL: ToolDefinition = {
  id: "claude-code",
  name: "Claude Code",
  dataDir: join(homedir(), ".claude", "projects"),
};

const TRANSCRIPT_DIRS = [
  join(homedir(), ".claude", "transcripts"),
  join(homedir(), ".claude", "sessions"),
];

function extractProject(filePath: string): string {
  const projectsPrefix = TOOL.dataDir + sep;
  if (!filePath.startsWith(projectsPrefix)) return "unknown";
  const relative = filePath.slice(projectsPrefix.length);
  const firstSegment = relative.split(sep)[0];
  if (!firstSegment) return "unknown";
  const parts = firstSegment.split("-").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "unknown";
}

class ClaudeCodeParser implements IParser {
  readonly tool = TOOL;

  async parse(): Promise<ParseResult> {
    const entries: TokenUsageEntry[] = [];
    const sessionEvents: SessionEvent[] = [];
    const seenUuids = new Set<string>();
    const seenSessionIds = new Set<string>();

    const projectFiles = findJsonlFiles(TOOL.dataDir);

    for (const filePath of projectFiles) {
      const content = readFileSafe(filePath);
      if (!content) continue;

      const project = extractProject(filePath);
      const sessionId = extractSessionId(filePath);
      seenSessionIds.add(sessionId);

      for (const line of content.split("\n")) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          const timestamp = obj.timestamp;
          if (!timestamp) continue;

          const parsedTimestamp = new Date(timestamp);
          if (Number.isNaN(parsedTimestamp.getTime())) continue;

          if (obj.type === "user" || obj.type === "assistant") {
            sessionEvents.push({
              sessionId,
              source: "claude-code",
              project,
              timestamp: parsedTimestamp,
              role: obj.type === "user" ? "user" : "assistant",
            });
          }

          if (obj.type !== "assistant") continue;
          const message = obj.message;
          if (!message?.usage) continue;

          const usage = message.usage;
          if (usage.input_tokens == null && usage.output_tokens == null) {
            continue;
          }

          const uuid = obj.uuid;
          if (uuid) {
            if (seenUuids.has(uuid)) continue;
            seenUuids.add(uuid);
          }

          entries.push({
            sessionId,
            source: "claude-code",
            model: message.model || "unknown",
            project,
            timestamp: parsedTimestamp,
            inputTokens: usage.input_tokens || 0,
            outputTokens: usage.output_tokens || 0,
            reasoningTokens: 0,
            cachedTokens: usage.cache_read_input_tokens || 0,
          });
        } catch {
          // Ignore malformed lines and continue scanning the session log.
        }
      }
    }

    for (const transcriptsDir of TRANSCRIPT_DIRS) {
      const transcriptFiles = findJsonlFiles(transcriptsDir);

      for (const filePath of transcriptFiles) {
        const sessionId = extractSessionId(filePath);
        if (seenSessionIds.has(sessionId)) continue;

        const content = readFileSafe(filePath);
        if (!content) continue;

        for (const line of content.split("\n")) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            const timestamp = obj.timestamp;
            if (!timestamp) continue;

            const parsedTimestamp = new Date(timestamp);
            if (Number.isNaN(parsedTimestamp.getTime())) continue;

            if (obj.type === "user" || obj.type === "assistant") {
              sessionEvents.push({
                sessionId,
                source: "claude-code",
                project: "unknown",
                timestamp: parsedTimestamp,
                role: obj.type === "user" ? "user" : "assistant",
              });
            }
          } catch {
            // Ignore malformed lines and continue scanning the transcript log.
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
    return (
      existsSync(TOOL.dataDir) || TRANSCRIPT_DIRS.some((dir) => existsSync(dir))
    );
  }
}

registerParser(new ClaudeCodeParser());
