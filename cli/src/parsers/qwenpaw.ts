import { existsSync, readdirSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { join } from "node:path";
import { aggregateToBuckets } from "../domain/aggregator";
import type {
  ParseResult,
  SessionEvent,
  SessionMetadata,
  SessionModelUsage,
  TokenUsageEntry,
} from "../domain/types";
import { readFileSafe } from "../infrastructure/fs/utils";
import { registerParser } from "./registry";
import type { IParser, ToolDefinition } from "./types";

const TOOL_ID = "qwenpaw";
const TOOL_NAME = "QwenPaw";
const DEFAULT_USAGE_PATH = join(homedir(), ".qwenpaw", "token_usage.json");
const DEFAULT_WORKSPACE_PATH = join(homedir(), ".qwenpaw", "workspace");

interface QwenPawUsageRecord {
  provider_id?: unknown;
  model_name?: unknown;
  prompt_tokens?: unknown;
  completion_tokens?: unknown;
  call_count?: unknown;
}

type QwenPawUsageFile = Record<string, Record<string, QwenPawUsageRecord>>;

interface QwenPawChatRecord {
  channel: string;
  created_at: string;
  id: string;
  name: string;
  session_id: string;
  user_id: string;
  status: string;
  updated_at: string;
}

interface QwenPawChatsFile {
  chats: QwenPawChatRecord[];
  version: number;
}

interface QwenPawSessionContent {
  type: string;
  text?: string;
  thinking?: string;
  input?: unknown;
  output?: unknown;
}

interface QwenPawMessage {
  id: string;
  name: string;
  role: "user" | "assistant" | "system";
  content: QwenPawSessionContent[];
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface QwenPawAgentData {
  memory?: {
    content: Array<[QwenPawMessage, unknown]>;
  };
}

interface QwenPawSessionFile {
  agent: QwenPawAgentData;
}

export interface QwenPawParserOptions {
  usagePath?: string;
  workspacePath?: string;
}

function createToolDefinition(usagePath: string): ToolDefinition {
  return {
    id: TOOL_ID,
    name: TOOL_NAME,
    dataDir: usagePath,
  };
}

function toSafeNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
}

function parseUsageDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const timestamp = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function resolveModel(recordKey: string, record: QwenPawUsageRecord): string {
  const providerId = getString(record.provider_id);
  const modelName = getString(record.model_name);

  if (providerId && modelName) {
    return `${providerId}:${modelName}`;
  }

  return modelName || recordKey || "unknown";
}

export class QwenPawParser implements IParser {
  readonly tool: ToolDefinition;
  private readonly usagePath: string;
  private readonly workspacePath: string;

  constructor(options: QwenPawParserOptions = {}) {
    this.usagePath = options.usagePath || DEFAULT_USAGE_PATH;
    this.workspacePath = options.workspacePath || DEFAULT_WORKSPACE_PATH;
    this.tool = createToolDefinition(this.usagePath);
  }

  async parse(): Promise<ParseResult> {
    const entries: TokenUsageEntry[] = [];
    const sessionEvents: SessionEvent[] = [];

    const content = readFileSafe(this.usagePath);
    if (content) {
      try {
        const usageFile = JSON.parse(content) as QwenPawUsageFile;

        for (const [dateKey, recordsByModel] of Object.entries(usageFile)) {
          const timestamp = parseUsageDate(dateKey);
          if (!timestamp || typeof recordsByModel !== "object") {
            continue;
          }

          for (const [recordKey, record] of Object.entries(recordsByModel)) {
            if (!record || typeof record !== "object") {
              continue;
            }

            const inputTokens = toSafeNumber(record.prompt_tokens);
            const outputTokens = toSafeNumber(record.completion_tokens);
            if (inputTokens === 0 && outputTokens === 0) {
              continue;
            }

            entries.push({
              source: TOOL_ID,
              model: resolveModel(recordKey, record),
              project: "unknown",
              timestamp,
              inputTokens,
              outputTokens,
              reasoningTokens: 0,
              cachedTokens: 0,
            });
          }
        }
      } catch {}
    }

    const workspaceSessions = await this.parseWorkspaceSessions();
    sessionEvents.push(...workspaceSessions);

    return {
      buckets: aggregateToBuckets(entries),
      sessions: this.aggregateSessions(sessionEvents),
    };
  }

  private async parseWorkspaceSessions(): Promise<SessionEvent[]> {
    const events: SessionEvent[] = [];

    if (!existsSync(this.workspacePath)) {
      return events;
    }

    try {
      const workspaceDirs = readdirSync(this.workspacePath);

      for (const workspaceDir of workspaceDirs) {
        const workspacePath = join(this.workspacePath, workspaceDir);
        const chatsPath = join(workspacePath, "chats.json");
        const sessionsPath = join(workspacePath, "sessions");

        // Parse chats.json to get session metadata
        const chatsContent = readFileSafe(chatsPath);
        if (!chatsContent) {
          continue;
        }

        let chatsFile: QwenPawChatsFile;
        try {
          chatsFile = JSON.parse(chatsContent) as QwenPawChatsFile;
        } catch {
          continue;
        }

        if (!chatsFile.chats || !Array.isArray(chatsFile.chats)) {
          continue;
        }

        // Parse individual session files
        const sessionFiles = this.getSessionFiles(sessionsPath);

        for (const chat of chatsFile.chats) {
          const sessionFileContent = sessionFiles.get(chat.session_id);
          if (!sessionFileContent) {
            continue;
          }

          try {
            const sessionData = JSON.parse(
              sessionFileContent,
            ) as QwenPawSessionFile;
            const sessionMessages = this.extractMessages(sessionData);

            for (const msg of sessionMessages) {
              events.push({
                sessionId: chat.session_id,
                source: TOOL_ID,
                project: workspaceDir,
                timestamp: new Date(msg.timestamp),
                role: msg.role as "user" | "assistant",
              });
            }
          } catch {}
        }
      }
    } catch {
      // If workspace directory can't be read, just return empty events
    }

    return events;
  }

  private getSessionFiles(sessionsPath: string): Map<string, string> {
    const files = new Map<string, string>();

    if (!existsSync(sessionsPath)) {
      return files;
    }

    try {
      const sessionFileNames = readdirSync(sessionsPath);

      for (const fileName of sessionFileNames) {
        if (!fileName.endsWith(".json")) {
          continue;
        }

        const filePath = join(sessionsPath, fileName);
        const content = readFileSafe(filePath);
        if (content) {
          // Extract session_id from filename: format is "{channel}_{session_id}.json"
          const sessionId = fileName
            .replace(/^[^_]+_/, "")
            .replace(".json", "");
          files.set(sessionId, content);
        }
      }
    } catch {
      // If sessions directory can't be read, return empty map
    }

    return files;
  }

  private extractMessages(sessionData: QwenPawSessionFile): QwenPawMessage[] {
    const messages: QwenPawMessage[] = [];

    if (!sessionData.agent?.memory?.content) {
      return messages;
    }

    for (const [messageData] of sessionData.agent.memory.content) {
      if (!messageData || typeof messageData !== "object") {
        continue;
      }

      const msg = messageData as unknown as QwenPawMessage;

      // Only include user and assistant messages (skip system messages)
      if ((msg.role === "user" || msg.role === "assistant") && msg.timestamp) {
        messages.push(msg);
      }
    }

    return messages;
  }

  private aggregateSessions(events: SessionEvent[]): SessionMetadata[] {
    const sessionMap = new Map<
      string,
      {
        source: string;
        project: string;
        firstMessageAt: Date;
        lastMessageAt: Date;
        messageCount: number;
        userMessageCount: number;
        modelUsages: Map<string, { inputTokens: number; outputTokens: number }>;
      }
    >();

    for (const event of events) {
      const key = `${event.sessionId}|${event.source}|${event.project}`;

      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          source: event.source,
          project: event.project,
          firstMessageAt: event.timestamp,
          lastMessageAt: event.timestamp,
          messageCount: 0,
          userMessageCount: 0,
          modelUsages: new Map(),
        });
      }

      const session = sessionMap.get(key);
      if (!session) continue;

      session.lastMessageAt =
        event.timestamp > session.lastMessageAt
          ? event.timestamp
          : session.lastMessageAt;
      session.messageCount++;

      if (event.role === "user") {
        session.userMessageCount++;
      }
    }

    return Array.from(sessionMap.entries()).map(([sessionKey, sessionData]) => {
      const [sessionHash] = sessionKey.split("|");
      const firstMessageAt = sessionData.firstMessageAt.toISOString();
      const lastMessageAt = sessionData.lastMessageAt.toISOString();
      const durationSeconds = Math.floor(
        (sessionData.lastMessageAt.getTime() -
          sessionData.firstMessageAt.getTime()) /
          1000,
      );

      // For now, we don't have token data from sessions, so set to 0
      const inputTokens = 0;
      const outputTokens = 0;
      const reasoningTokens = 0;
      const cachedTokens = 0;
      const totalTokens = 0;

      // Build model usages array (empty for now as we don't have model data)
      const modelUsages: SessionModelUsage[] = Array.from(
        sessionData.modelUsages.entries(),
      ).map(([model, usage]) => ({
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        reasoningTokens: 0,
        cachedTokens: 0,
        totalTokens: usage.inputTokens + usage.outputTokens,
      }));

      return {
        source: sessionData.source,
        project: sessionData.project,
        sessionHash,
        hostname: hostname().replace(/\.local$/, ""),
        firstMessageAt,
        lastMessageAt,
        durationSeconds,
        activeSeconds: durationSeconds, // Assume all time is active for now
        messageCount: sessionData.messageCount,
        userMessageCount: sessionData.userMessageCount,
        userPromptHours: [], // No hourly data available
        inputTokens,
        outputTokens,
        reasoningTokens,
        cachedTokens,
        totalTokens,
        primaryModel: "unknown", // No model data available from session files
        modelUsages,
      };
    });
  }

  isInstalled(): boolean {
    return existsSync(this.usagePath) || existsSync(this.workspacePath);
  }
}

registerParser(new QwenPawParser());
