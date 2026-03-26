import { describe, expect, it } from "vitest";

import { aggregateToBuckets } from "./aggregator";

describe("aggregateToBuckets", () => {
  it("includes cached tokens in totalTokens", () => {
    const [bucket] = aggregateToBuckets([
      {
        source: "codex",
        model: "gpt-5.4",
        project: "tokens-burned",
        timestamp: new Date("2026-03-26T10:00:00.000Z"),
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 25,
      },
    ]);

    expect(bucket.totalTokens).toBe(175);
  });
});
