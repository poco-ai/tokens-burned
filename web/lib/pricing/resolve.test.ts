import { describe, expect, it } from "vitest";

import type { PricingCatalog } from "./catalog";
import {
  buildModelLookupCandidates,
  estimateCostUsd,
  resolveOfficialPricingMatch,
  resolveOfficialPricingProvider,
  resolveOfficialPricingProviderId,
} from "./resolve";

const catalog: PricingCatalog = new Map([
  [
    "minimax",
    {
      id: "minimax",
      name: "MiniMax",
      modelsByLower: new Map([
        [
          "minimax-m2.5",
          {
            id: "MiniMax-M2.5",
            name: "MiniMax M2.5",
            cost: {
              input: 0.3,
              output: 1.2,
              cache_read: 0.03,
            },
          },
        ],
      ]),
    },
  ],
  [
    "moonshotai",
    {
      id: "moonshotai",
      name: "Moonshot AI",
      modelsByLower: new Map([
        [
          "kimi-k2.5",
          {
            id: "kimi-k2.5",
            name: "Kimi K2.5",
            cost: {
              input: 0.6,
              output: 3,
              cache_read: 0.1,
            },
          },
        ],
      ]),
    },
  ],
  [
    "alibaba",
    {
      id: "alibaba",
      name: "Alibaba",
      modelsByLower: new Map([
        [
          "qwen-plus",
          {
            id: "qwen-plus",
            name: "Qwen Plus",
            cost: {
              input: 0.4,
              output: 1.2,
              reasoning: 4,
            },
          },
        ],
      ]),
    },
  ],
]);

describe("resolveOfficialPricingProviderId", () => {
  it("normalizes model casing before resolving the official provider", () => {
    expect(resolveOfficialPricingProviderId("MiniMax-M2.5")).toBe("minimax");
    expect(resolveOfficialPricingProviderId("Qwen-Plus")).toBe("alibaba");
  });
});

describe("resolveOfficialPricingMatch", () => {
  it("matches provider-prefixed model names against official catalog ids", () => {
    expect(
      resolveOfficialPricingMatch(catalog, "moonshotai/kimi-k2.5"),
    ).toEqual(
      expect.objectContaining({
        providerId: "moonshotai",
        modelId: "kimi-k2.5",
        modelName: "Kimi K2.5",
      }),
    );
  });
});

describe("resolveOfficialPricingProvider", () => {
  it("returns the official provider even when the exact catalog model is not matched", () => {
    expect(
      resolveOfficialPricingProvider(catalog, "moonshotai/kimi-k2.5:latest"),
    ).toEqual({
      providerId: "moonshotai",
      providerName: "Moonshot AI",
    });
  });
});

describe("estimateCostUsd", () => {
  it("falls back to output pricing when reasoning has no dedicated rate", () => {
    const result = estimateCostUsd(
      {
        inputTokens: 100_000,
        outputTokens: 50_000,
        reasoningTokens: 25_000,
        cachedTokens: 10_000,
      },
      {
        input: 0.6,
        output: 3,
        cache_read: 0.1,
      },
    );

    expect(result).not.toBeNull();
    expect(result?.inputUsd).toBeCloseTo(0.06);
    expect(result?.outputUsd).toBeCloseTo(0.15);
    expect(result?.reasoningUsd).toBeCloseTo(0.075);
    expect(result?.cacheUsd).toBeCloseTo(0.001);
    expect(result?.totalUsd).toBeCloseTo(0.286);
  });

  it("uses a dedicated reasoning rate when the catalog provides one", () => {
    const match = resolveOfficialPricingMatch(catalog, "qwen-plus");
    const result = estimateCostUsd(
      {
        inputTokens: 100_000,
        outputTokens: 50_000,
        reasoningTokens: 25_000,
        cachedTokens: 0,
      },
      match?.cost,
    );

    expect(result).not.toBeNull();
    expect(result?.inputUsd).toBeCloseTo(0.04);
    expect(result?.outputUsd).toBeCloseTo(0.06);
    expect(result?.reasoningUsd).toBeCloseTo(0.1);
    expect(result?.cacheUsd).toBeCloseTo(0);
    expect(result?.totalUsd).toBeCloseTo(0.2);
  });

  it("returns null when cost is null from estimateCostUsd", () => {
    expect(
      estimateCostUsd(
        {
          inputTokens: 100,
          outputTokens: 50,
          reasoningTokens: 25,
          cachedTokens: 10,
        },
        null,
      ),
    ).toBeNull();
  });

  it("returns zero cost from estimateCostUsd when all token counts are zero", () => {
    const result = estimateCostUsd(
      {
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        cachedTokens: 0,
      },
      { input: 1, output: 2 },
    );

    expect(result).not.toBeNull();
    expect(result?.totalUsd).toBe(0);
    expect(result?.inputUsd).toBe(0);
    expect(result?.outputUsd).toBe(0);
    expect(result?.reasoningUsd).toBe(0);
    expect(result?.cacheUsd).toBe(0);
  });
});

describe("buildModelLookupCandidates", () => {
  it("returns an empty array for an empty string", () => {
    expect(buildModelLookupCandidates("")).toEqual([]);
  });

  it("extracts both segments when model name contains / separator", () => {
    const candidates = buildModelLookupCandidates("anthropic/claude-sonnet-4");
    expect(candidates).toContain("anthropic/claude-sonnet-4");
    expect(candidates).toContain("claude-sonnet-4");
  });

  it("strips the variant suffix when model name contains : separator", () => {
    const candidates = buildModelLookupCandidates("claude-sonnet-4:latest");
    expect(candidates).toContain("claude-sonnet-4");
    expect(candidates).toContain("claude-sonnet-4:latest");
  });
});

describe("resolveOfficialPricingMatch edge cases", () => {
  it("returns null when catalog is null", () => {
    expect(resolveOfficialPricingMatch(null, "claude-sonnet-4")).toBeNull();
  });

  it("returns null when the model is not found in the catalog", () => {
    expect(
      resolveOfficialPricingMatch(catalog, "minimax/unknown-model-xyz"),
    ).toBeNull();
  });
});

describe("resolveOfficialPricingProviderId edge cases", () => {
  it("returns null for an unknown model that matches no provider rule", () => {
    expect(
      resolveOfficialPricingProviderId("totally-unknown-model"),
    ).toBeNull();
  });
});
