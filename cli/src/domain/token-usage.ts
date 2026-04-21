import type { TokenUsageEntry } from "./types";

const TOKEN_COUNT_KEYS = [
  "inputTokens",
  "outputTokens",
  "reasoningTokens",
  "cachedTokens",
] as const;

export function hasInvalidTokenCounts(
  entry: Pick<TokenUsageEntry, (typeof TOKEN_COUNT_KEYS)[number]>,
): boolean {
  return TOKEN_COUNT_KEYS.some((key) => {
    const value = entry[key];
    return !Number.isSafeInteger(value) || value < 0;
  });
}
