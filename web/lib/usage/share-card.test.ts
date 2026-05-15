import { describe, expect, it } from "vitest";
import {
  buildUsageShareCardData,
  usageShareCardTemplates,
} from "@/lib/usage/share-card";
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
  it("includes the receipt share template", () => {
    expect(usageShareCardTemplates).toContain("receipt");
  });

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
    expect(data.modelUsage).toEqual([{ label: "GPT-5", totalTokens: 700_000 }]);
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
    expect(data.modelUsage).toEqual([
      { label: "GPT-5", totalTokens: 300_000 },
      { label: "Claude 4", totalTokens: 280_000 },
      { label: "Gemini 2.5", totalTokens: 220_000 },
    ]);
    expect(data.insight).toEqual({
      kind: "model_variety",
      count: 3,
    });
    expect(data.trend).toHaveLength(10);
  });

  it("assigns the cache guardian persona when cache tokens are significant", () => {
    const data = buildUsageShareCardData({
      username: "bob",
      range: {
        from: new Date("2026-03-01T00:00:00.000Z"),
        to: new Date("2026-03-07T23:59:59.999Z"),
        granularity: "day",
        preset: "7d",
        timezone: "Asia/Shanghai",
      },
      filters: {},
      overview: createOverview({
        totalTokens: { current: 1_000_000, previous: 800_000, delta: 200_000 },
        inputTokens: { current: 400_000, previous: 320_000, delta: 80_000 },
        outputTokens: { current: 300_000, previous: 240_000, delta: 60_000 },
        reasoningTokens: { current: 100_000, previous: 80_000, delta: 20_000 },
        cachedTokens: { current: 200_000, previous: 160_000, delta: 40_000 },
        activeSeconds: { current: 10_000, previous: 8_000, delta: 2_000 },
        totalSeconds: { current: 15_000, previous: 12_000, delta: 3_000 },
        sessions: { current: 5, previous: 4, delta: 1 },
        messages: { current: 60, previous: 48, delta: 12 },
      }),
      breakdowns: createBreakdowns({
        models: [
          {
            key: "gpt-5",
            name: "GPT-5",
            totalTokens: 800_000,
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
            share: 0.8,
          },
        ],
      }),
      tokenTrend: createTrend(7),
    });

    expect(data.persona).toBe("cache_guardian");
    expect(data.insight).toEqual({
      kind: "cache_share",
      share: 0.2,
    });
  });

  it("assigns the project deep diver persona when one project dominates", () => {
    const data = buildUsageShareCardData({
      username: "carol",
      range: {
        from: new Date("2026-03-01T00:00:00.000Z"),
        to: new Date("2026-03-07T23:59:59.999Z"),
        granularity: "day",
        preset: "7d",
        timezone: "Asia/Shanghai",
      },
      filters: {},
      overview: createOverview({
        totalTokens: { current: 1_000_000, previous: 900_000, delta: 100_000 },
        inputTokens: { current: 500_000, previous: 450_000, delta: 50_000 },
        outputTokens: { current: 400_000, previous: 360_000, delta: 40_000 },
        reasoningTokens: { current: 50_000, previous: 40_000, delta: 10_000 },
        cachedTokens: { current: 50_000, previous: 50_000, delta: 0 },
        activeSeconds: { current: 12_000, previous: 10_000, delta: 2_000 },
        totalSeconds: { current: 18_000, previous: 15_000, delta: 3_000 },
        sessions: { current: 4, previous: 3, delta: 1 },
        messages: { current: 50, previous: 40, delta: 10 },
      }),
      breakdowns: createBreakdowns({
        projects: [
          {
            key: "proj-1",
            name: "my-project",
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

    expect(data.persona).toBe("project_deep_diver");
    expect(data.insight).toEqual({
      kind: "project_focus",
      share: 0.7,
      label: "my-project",
    });
  });

  it("assigns the rapid shipper persona for many short sessions", () => {
    const data = buildUsageShareCardData({
      username: "dave",
      range: {
        from: new Date("2026-03-01T00:00:00.000Z"),
        to: new Date("2026-03-07T23:59:59.999Z"),
        granularity: "day",
        preset: "7d",
        timezone: "Asia/Shanghai",
      },
      filters: {},
      overview: createOverview({
        totalTokens: { current: 1_000_000, previous: 900_000, delta: 100_000 },
        inputTokens: { current: 500_000, previous: 450_000, delta: 50_000 },
        outputTokens: { current: 400_000, previous: 360_000, delta: 40_000 },
        reasoningTokens: { current: 50_000, previous: 40_000, delta: 10_000 },
        cachedTokens: { current: 50_000, previous: 50_000, delta: 0 },
        activeSeconds: { current: 5_000, previous: 4_000, delta: 1_000 },
        totalSeconds: { current: 8_000, previous: 7_000, delta: 1_000 },
        sessions: { current: 12, previous: 10, delta: 2 },
        messages: { current: 80, previous: 70, delta: 10 },
      }),
      breakdowns: createBreakdowns({
        models: [
          {
            key: "gpt-5",
            name: "GPT-5",
            totalTokens: 900_000,
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
            share: 0.9,
          },
        ],
      }),
      tokenTrend: createTrend(7),
    });

    expect(data.persona).toBe("rapid_shipper");
    expect(data.insight).toEqual({
      kind: "session_count",
      count: 12,
    });
  });

  it("assigns the steady builder persona as the default fallback", () => {
    const data = buildUsageShareCardData({
      username: "eve",
      range: {
        from: new Date("2026-03-01T00:00:00.000Z"),
        to: new Date("2026-03-07T23:59:59.999Z"),
        granularity: "day",
        preset: "7d",
        timezone: "Asia/Shanghai",
      },
      filters: {},
      overview: createOverview({
        totalTokens: { current: 500_000, previous: 400_000, delta: 100_000 },
        inputTokens: { current: 250_000, previous: 200_000, delta: 50_000 },
        outputTokens: { current: 150_000, previous: 120_000, delta: 30_000 },
        reasoningTokens: { current: 50_000, previous: 40_000, delta: 10_000 },
        cachedTokens: { current: 50_000, previous: 40_000, delta: 10_000 },
        activeSeconds: { current: 7200, previous: 5000, delta: 2200 },
        totalSeconds: { current: 10_000, previous: 8_000, delta: 2_000 },
        sessions: { current: 3, previous: 2, delta: 1 },
        messages: { current: 30, previous: 20, delta: 10 },
      }),
      breakdowns: createBreakdowns({
        models: [
          {
            key: "gpt-5",
            name: "GPT-5",
            totalTokens: 400_000,
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
            share: 0.8,
          },
        ],
      }),
      tokenTrend: createTrend(7),
    });

    expect(data.persona).toBe("steady_builder");
    expect(data.insight).toEqual({
      kind: "active_time",
      seconds: 7200,
    });
  });

  it("compresses long trends to at most 12 data points", () => {
    const data = buildUsageShareCardData({
      username: "test",
      range: {
        from: new Date("2026-03-01T00:00:00.000Z"),
        to: new Date("2026-03-07T23:59:59.999Z"),
        granularity: "day",
        preset: "7d",
        timezone: "UTC",
      },
      filters: {},
      overview: createOverview(),
      breakdowns: createBreakdowns(),
      tokenTrend: createTrend(25),
    });

    expect(data.trend.length).toBeLessThanOrEqual(12);
    expect(data.trend.length).toBeGreaterThan(0);
    for (const point of data.trend) {
      expect(point).toHaveProperty("label");
      expect(point).toHaveProperty("totalTokens");
      expect(point).toHaveProperty("estimatedCostUsd");
      expect(point).toHaveProperty("totalSeconds");
    }
  });

  it("preserves short trends without compression", () => {
    const data = buildUsageShareCardData({
      username: "test",
      range: {
        from: new Date("2026-03-01T00:00:00.000Z"),
        to: new Date("2026-03-07T23:59:59.999Z"),
        granularity: "day",
        preset: "7d",
        timezone: "UTC",
      },
      filters: {},
      overview: createOverview(),
      breakdowns: createBreakdowns(),
      tokenTrend: createTrend(5),
    });

    expect(data.trend).toHaveLength(5);
    expect(data.trend[0]?.label).toBe("day-1");
    expect(data.trend[4]?.label).toBe("day-5");
  });

  it("maps presets to the correct share card period", () => {
    const baseInput = {
      username: "test",
      filters: {},
      overview: createOverview(),
      breakdowns: createBreakdowns(),
      tokenTrend: createTrend(1),
    };

    const dayData = buildUsageShareCardData({
      ...baseInput,
      range: {
        from: new Date("2026-03-26T00:00:00.000Z"),
        to: new Date("2026-03-26T23:59:59.999Z"),
        granularity: "hour",
        preset: "1d",
        timezone: "UTC",
      },
    });
    expect(dayData.period).toBe("day");

    const weekData = buildUsageShareCardData({
      ...baseInput,
      range: {
        from: new Date("2026-03-20T00:00:00.000Z"),
        to: new Date("2026-03-26T23:59:59.999Z"),
        granularity: "day",
        preset: "7d",
        timezone: "UTC",
      },
    });
    expect(weekData.period).toBe("week");

    const monthData = buildUsageShareCardData({
      ...baseInput,
      range: {
        from: new Date("2026-02-25T00:00:00.000Z"),
        to: new Date("2026-03-26T23:59:59.999Z"),
        granularity: "day",
        preset: "30d",
        timezone: "UTC",
      },
    });
    expect(monthData.period).toBe("month");

    const customData = buildUsageShareCardData({
      ...baseInput,
      range: {
        from: new Date("2026-03-24T00:00:00.000Z"),
        to: new Date("2026-03-26T23:59:59.999Z"),
        granularity: "day",
        preset: "custom",
        timezone: "UTC",
      },
    });
    expect(customData.period).toBe("custom");
  });
});
