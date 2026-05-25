import { readFileSync, statSync } from "node:fs";
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

const EXTENSION_ID = "saoudrizwan.claude-dev";

const HOSTS = [
  "Code",
  "Cursor",
  "Windsurf",
  "VSCodium",
  "Code - Insiders",
  "Trae",
  "Trae CN",
];

const TOOL: ToolDefinition = {
  id: "cline",
  name: "Cline",
  dataDir: join(homedir(), ".cline"),
};

function getHostRoots(): string[] {
  const out: string[] = [];
  if (process.platform === "darwin") {
    const base = join(homedir(), "Library", "Application Support");
    for (const h of HOSTS) out.push(join(base, h));
  } else if (process.platform === "win32") {
    const appData =
      process.env.APPDATA?.trim() || join(homedir(), "AppData", "Roaming");
    for (const h of HOSTS) out.push(join(appData, h));
  } else {
    const xdg =
      process.env.XDG_CONFIG_HOME?.trim() || join(homedir(), ".config");
    for (const h of HOSTS) out.push(join(xdg, h));
  }
  return out;
}

function findClineExtensionDirs(): string[] {
  const dirs: string[] = [];
  for (const root of getHostRoots()) {
    const ext = join(root, "User", "globalStorage", EXTENSION_ID);
    try {
      if (statSync(ext).isDirectory()) dirs.push(ext);
    } catch {
      // not installed in this host; skip
    }
  }
  return dirs;
}

function readJsonSafe(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function projectFromPath(absPath: unknown): string {
  if (!absPath || typeof absPath !== "string") return "unknown";
  const trimmed = absPath.replace(/[\\/]+$/, "");
  const name = basename(trimmed);
  return name || "unknown";
}

class ClineParser implements IParser {
  readonly tool = TOOL;

  isInstalled(): boolean {
    return findClineExtensionDirs().length > 0;
  }

  async parse(): Promise<ParseResult> {
    const extDirs = findClineExtensionDirs();
    if (extDirs.length === 0) return { buckets: [], sessions: [] };

    const entries: TokenUsageEntry[] = [];
    const sessionEvents: SessionEvent[] = [];

    for (const extDir of extDirs) {
      const history = readJsonSafe(join(extDir, "state", "taskHistory.json"));
      if (!Array.isArray(history)) continue;

      for (const item of history) {
        try {
          if (!item || typeof item !== "object" || !item.id) continue;
          const taskId = String(item.id);
          const project = projectFromPath(
            (item as Record<string, unknown>).cwdOnTaskInitialization ||
              (item as Record<string, unknown>).shadowGitConfigWorkTree,
          );
          const fallbackModel =
            ((item as Record<string, unknown>).modelId &&
              String((item as Record<string, unknown>).modelId).trim()) ||
            "cline-unknown";

          const messages = readJsonSafe(
            join(extDir, "tasks", taskId, "ui_messages.json"),
          );
          if (!Array.isArray(messages)) continue;

          for (const msg of messages) {
            if (!msg || typeof msg !== "object") continue;
            const ts = Number((msg as Record<string, unknown>).ts);
            if (!Number.isFinite(ts)) continue;
            const timestamp = new Date(ts);

            const msgType = (msg as Record<string, unknown>).type;
            const msgSay = (msg as Record<string, unknown>).say;

            if (msgType === "say" && msgSay === "api_req_started") {
              let info: Record<string, unknown> | null = null;
              try {
                const text = (msg as Record<string, unknown>).text;
                if (typeof text === "string") info = JSON.parse(text);
              } catch {
                /* skip */
              }
              if (!info) continue;

              const inputTokens = Math.max(0, Number(info.tokensIn) || 0);
              const outputTokens = Math.max(0, Number(info.tokensOut) || 0);
              const cacheWrites = Math.max(0, Number(info.cacheWrites) || 0);
              const cacheReads = Math.max(0, Number(info.cacheReads) || 0);
              if (inputTokens + outputTokens + cacheWrites + cacheReads === 0)
                continue;

              const model =
                (info.model && String(info.model).trim()) || fallbackModel;
              if (typeof model !== "string") continue;

              entries.push({
                source: "cline",
                model,
                project,
                timestamp,
                inputTokens: inputTokens + cacheWrites,
                outputTokens,
                reasoningTokens: 0,
                cachedTokens: cacheReads,
              });
            }

            if (
              msgType === "ask" ||
              (msgType === "say" && msgSay === "user_feedback")
            ) {
              sessionEvents.push({
                sessionId: taskId,
                source: "cline",
                project,
                timestamp,
                role: "user",
              });
            } else if (msgType === "say" && msgSay === "api_req_started") {
              sessionEvents.push({
                sessionId: taskId,
                source: "cline",
                project,
                timestamp,
                role: "assistant",
              });
            }
          }
        } catch {
          // Skip this task; keep going for the rest of the history.
        }
      }
    }

    return {
      buckets: aggregateToBuckets(entries),
      sessions: extractSessions(sessionEvents, entries),
    };
  }
}

registerParser(new ClineParser());
