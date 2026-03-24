import { hostname } from "node:os";
import type { TokenUsageEntry, TokenBucket } from "./types";

/**
 * Round a date down to the nearest 30-minute bucket
 */
export function roundToHalfHour(date: Date): Date {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0);
  return d;
}

/**
 * Aggregate raw token usage entries into 30-minute buckets
 */
export function aggregateToBuckets(entries: TokenUsageEntry[]): TokenBucket[] {
  const map = new Map<string, TokenBucket>();
  const host = hostname().replace(/\.local$/, "");

  for (const e of entries) {
    const bucketStart = roundToHalfHour(e.timestamp).toISOString();
    const key = `${e.source}|${e.model}|${e.project}|${bucketStart}`;

    if (!map.has(key)) {
      map.set(key, {
        source: e.source,
        model: e.model,
        project: e.project,
        bucketStart,
        hostname: host,
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 0,
        reasoningOutputTokens: 0,
        totalTokens: 0,
      });
    }

    const b = map.get(key)!;
    b.inputTokens += e.inputTokens || 0;
    b.outputTokens += e.outputTokens || 0;
    b.cachedInputTokens += e.cachedInputTokens || 0;
    b.reasoningOutputTokens += e.reasoningOutputTokens || 0;
    b.totalTokens += (e.inputTokens || 0) + (e.outputTokens || 0) + (e.reasoningOutputTokens || 0);
  }

  return Array.from(map.values());
}

/**
 * Add hostname to buckets after privacy filtering
 */
export function addHostname(buckets: TokenBucket[]): void {
  const host = hostname().replace(/\.local$/, "");
  for (const b of buckets) {
    b.hostname = host;
  }
}
