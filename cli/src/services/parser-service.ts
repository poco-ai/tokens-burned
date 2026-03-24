import type { TokenBucket, SessionMetadata, ParseResult } from "../domain/types";
import { getAllParsers, detectInstalledTools } from "../parsers/registry";
import { logger } from "../utils/logger";

export interface ParserResult {
  source: string;
  buckets: number;
  sessions: number;
}

export interface AllParsersResult {
  buckets: TokenBucket[];
  sessions: SessionMetadata[];
  parserResults: ParserResult[];
}

/**
 * Run all registered parsers and collect results
 */
export async function runAllParsers(): Promise<AllParsersResult> {
  const allBuckets: TokenBucket[] = [];
  const allSessions: SessionMetadata[] = [];
  const parserResults: ParserResult[] = [];

  for (const parser of getAllParsers()) {
    try {
      const result: ParseResult = await parser.parse();
      const buckets = result.buckets;
      const sessions = result.sessions;

      if (buckets.length > 0) allBuckets.push(...buckets);
      if (sessions.length > 0) allSessions.push(...sessions);

      if (buckets.length > 0 || sessions.length > 0) {
        parserResults.push({
          source: parser.tool.id,
          buckets: buckets.length,
          sessions: sessions.length,
        });
      }
    } catch (err) {
      logger.warn(`${parser.tool.id} parser failed: ${(err as Error).message}`);
    }
  }

  return { buckets: allBuckets, sessions: allSessions, parserResults };
}

/**
 * Get list of detected tools for status display
 */
export function getDetectedTools() {
  return detectInstalledTools();
}
