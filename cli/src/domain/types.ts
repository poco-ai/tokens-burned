/**
 * Token usage entry - raw parsed result from a single message/event
 */
export interface TokenUsageEntry {
  source: string;
  model: string;
  project: string;
  timestamp: Date;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  reasoningOutputTokens: number;
}

/**
 * 30-minute aggregation bucket for server sync
 */
export interface TokenBucket {
  source: string;
  model: string;
  project: string;
  bucketStart: string;
  hostname: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
}

/**
 * Session timing event for extracting session metadata
 */
export interface SessionEvent {
  sessionId: string;
  source: string;
  project: string;
  timestamp: Date;
  role: "user" | "assistant";
}

/**
 * Session metadata for analytics
 */
export interface SessionMetadata {
  source: string;
  project: string;
  sessionHash: string;
  hostname: string;
  firstMessageAt: string;
  lastMessageAt: string;
  durationSeconds: number;
  activeSeconds: number;
  messageCount: number;
  userMessageCount: number;
  userPromptHours: number[];
}

/**
 * Result from a parser
 */
export interface ParseResult {
  buckets: TokenBucket[];
  sessions: SessionMetadata[];
}

/**
 * API settings response
 */
export interface ApiSettings {
  uploadProject: boolean;
}

/**
 * Ingest response from server
 */
export interface IngestResponse {
  ingested?: number;
  sessions?: number;
}
