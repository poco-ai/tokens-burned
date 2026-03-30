import { describe, expect, it } from "vitest";

import { aggregateToBuckets } from "./aggregator";

describe("aggregateToBuckets", () => {
  it("includes cached and reasoning tokens in totalTokens", () => {
    const [bucket] = aggregateToBuckets([
      {
        source: "codex",
        model: "gpt-5.4",
        project: "tokenarena",
        timestamp: new Date("2026-03-26T10:00:00.000Z"),
        inputTokens: 100,
        outputTokens: 60,
        cachedTokens: 25,
        reasoningTokens: 10,
      },
    ]);

    expect(bucket.outputTokens).toBe(60);
    expect(bucket.reasoningTokens).toBe(10);
    expect(bucket.totalTokens).toBe(195);
  });
});
