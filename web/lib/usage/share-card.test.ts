import { describe, expect, it } from "vitest";
import { buildUsageShareCardData } from "@/lib/usage/share-card";
import type {
  TokenTrendPoint,
  UsageBreakdowns,
  UsageOverviewMetrics,
} from "@/lib/usage/types";

function createOverview(
  overrides?: Partial<
    Record<
      keyof UsageOverviewMetrics,
      { current: number; previous: number; delta: number }
    >
  >,
): UsageOverviewMetrics {
  const base = {
    current: 0,
    previous: 0,
    delta: 0,
  };

  return {
    totalTokens: base,
    inputTokens: base,
    outputTokens: base,
    reasoningTokens: base,
    cachedTokens: base,
    activeSeconds: base,
    totalSeconds: base,
    sessions: base,
    messages: base,
    userMessages: base,
    ...overrides,
  };
}

function createBreakdowns(
  overrides?: Partial<UsageBreakdowns>,
): UsageBreakdowns {
  return {
    devices: [],
    tools: [],
    models: [],
    projects: [],
    ...overrides,
  };
}

function createTrend(count: number): TokenTrendPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    label: `day-${index + 1}`,
    start: `2026-03-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    totalTokens: 100 + index,
    inputTokens: 60,
    outputTokens: 20,
    reasoningTokens: 10,
    cachedTokens: 10,
    estimatedCostUsd: 0.1,
    totalSeconds: 60,
  }));
}

describe("buildUsageShareCardData", () => {
  it("assigns the reasoning persona when reasoning tokens dominate", () => {
    const data = buildUsageShareCardData({
      username: "alice",
      range: {
        from: new Date("2026-03-01T00:00:00.000Z"),
        to: new Date("2026-03-07T23:59:59.999Z"),
        granularity: "day",
        preset: "7d",
        timezone: "Asia/Shanghai",
      },
      filters: {},
      overview: createOverview({
        totalTokens: { current: 1_000_000, previous: 500_000, delta: 500_000 },
        inputTokens: { current: 300_000, previous: 150_000, delta: 150_000 },
        outputTokens: { current: 200_000, previous: 100_000, delta: 100_000 },
        reasoningTokens: {
          current: 350_000,
          previous: 150_000,
          delta: 200_000,
        },
        cachedTokens: { current: 150_000, previous: 100_000, delta: 50_000 },
        activeSeconds: { current: 20_000, previous: 10_000, delta: 10_000 },
        totalSeconds: { current: 25_000, previous: 12_000, delta: 13_000 },
        sessions: { current: 6, previous: 4, delta: 2 },
        messages: { current: 120, previous: 80, delta: 40 },
      }),
      pricingSummary: {
        currentUsd: 42.5,
        previousUsd: 20.1,
        deltaUsd: 22.4,
        pricedTokens: 1_000_000,
        totalTokens: 1_000_000,
        coverage: 1,
        pricedModels: 1,
        totalModels: 1,
      },
      breakdowns: createBreakdowns({
        models: [
          {
            key: "gpt-5",
            name: "GPT-5",
            totalTokens: 700_000,
            inputTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0,
            cachedTokens: 0,
            estimatedCostUsd: 0,
            activeSeconds: 0,
            totalSeconds: 0,
            sessions: 0,
            messages: 0,
            userMessages: 0,
            share: 0.7,
          },
        ],
      }),
      tokenTrend: createTrend(7),
    });

    expect(data.persona).toBe("reasoning_master");
    expect(data.insight).toEqual({
      kind: "reasoning_share",
      share: 0.35,
    });
  });

  it("assigns the model orchestrator persona for diverse model usage", () => {
    const data = buildUsageShareCardData({
      username: "alice",
      range: {
        from: new Date("2026-03-01T00:00:00.000Z"),
        to: new Date("2026-03-30T23:59:59.999Z"),
        granularity: "day",
        preset: "30d",
        timezone: "Asia/Shanghai",
      },
      filters: {},
      overview: createOverview({
        totalTokens: { current: 900_000, previous: 800_000, delta: 100_000 },
        inputTokens: { current: 400_000, previous: 350_000, delta: 50_000 },
        outputTokens: { current: 300_000, previous: 250_000, delta: 50_000 },
        reasoningTokens: { current: 80_000, previous: 70_000, delta: 10_000 },
        cachedTokens: { current: 120_000, previous: 130_000, delta: -10_000 },
        activeSeconds: { current: 30_000, previous: 28_000, delta: 2_000 },
        totalSeconds: { current: 36_000, previous: 34_000, delta: 2_000 },
        sessions: { current: 8, previous: 7, delta: 1 },
        messages: { current: 96, previous: 84, delta: 12 },
      }),
      pricingSummary: undefined,
      breakdowns: createBreakdowns({
        models: [
          {
            key: "gpt-5",
            name: "GPT-5",
            totalTokens: 300_000,
            inputTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0,
            cachedTokens: 0,
            estimatedCostUsd: 0,
            activeSeconds: 0,
            totalSeconds: 0,
            sessions: 0,
            messages: 0,
            userMessages: 0,
            share: 0.33,
          },
          {
            key: "claude",
            name: "Claude 4",
            totalTokens: 280_000,
            inputTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0,
            cachedTokens: 0,
            estimatedCostUsd: 0,
            activeSeconds: 0,
            totalSeconds: 0,
            sessions: 0,
            messages: 0,
            userMessages: 0,
            share: 0.31,
          },
          {
            key: "gemini",
            name: "Gemini 2.5",
            totalTokens: 220_000,
            inputTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0,
            cachedTokens: 0,
            estimatedCostUsd: 0,
            activeSeconds: 0,
            totalSeconds: 0,
            sessions: 0,
            messages: 0,
            userMessages: 0,
            share: 0.24,
          },
        ],
      }),
      tokenTrend: createTrend(30),
    });

    expect(data.persona).toBe("model_orchestrator");
    expect(data.insight).toEqual({
      kind: "model_variety",
      count: 3,
    });
    expect(data.trend).toHaveLength(10);
  });
});
