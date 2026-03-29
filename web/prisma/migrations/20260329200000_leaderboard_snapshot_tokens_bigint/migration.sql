-- Aggregated token totals can exceed signed 32-bit integer range.
ALTER TABLE "leaderboard_snapshot_entry"
  ALTER COLUMN "inputTokens" TYPE BIGINT,
  ALTER COLUMN "outputTokens" TYPE BIGINT,
  ALTER COLUMN "reasoningTokens" TYPE BIGINT,
  ALTER COLUMN "cachedTokens" TYPE BIGINT,
  ALTER COLUMN "totalTokens" TYPE BIGINT;
