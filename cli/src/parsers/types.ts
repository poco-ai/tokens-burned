import type { TokenUsageEntry, SessionEvent, ParseResult } from "../domain/types";

/**
 * Tool definition for parser registration
 */
export interface ToolDefinition {
  id: string;
  name: string;
  dataDir: string;
}

/**
 * Parser interface - all parsers must implement this
 */
export interface IParser {
  readonly tool: ToolDefinition;
  parse(): Promise<ParseResult>;
  isInstalled?(): boolean;
}

/**
 * Raw parse result before aggregation (for backward compatibility with ref implementation)
 */
export interface RawParseResult {
  entries: TokenUsageEntry[];
  sessionEvents: SessionEvent[];
}
