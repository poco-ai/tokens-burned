import { describe, expect, it } from "vitest";

import type { PricingCatalog } from "./catalog";
import {
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
});
