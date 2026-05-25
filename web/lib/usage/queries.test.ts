import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usageBucketFindMany: vi.fn(),
  usageBucketFindFirst: vi.fn(),
  usageSessionFindMany: vi.fn(),
  usageSessionFindFirst: vi.fn(),
  deviceFindMany: vi.fn(),
  deviceFindFirst: vi.fn(),
  usageApiKeyFindMany: vi.fn(),
  getPricingCatalog: vi.fn(),
  resolveOfficialPricingMatch: vi.fn(),
  resolveOfficialPricingProvider: vi.fn(),
  estimateCostUsd: vi.fn(),
  tokenCountToNumber: vi.fn((v: number | bigint | null | undefined) =>
    typeof v === "number" ? v : 0,
  ),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    usageBucket: {
      findMany: mocks.usageBucketFindMany,
      findFirst: mocks.usageBucketFindFirst,
    },
    usageSession: {
      findMany: mocks.usageSessionFindMany,
      findFirst: mocks.usageSessionFindFirst,
    },
    device: {
      findMany: mocks.deviceFindMany,
      findFirst: mocks.deviceFindFirst,
    },
    usageApiKey: {
      findMany: mocks.usageApiKeyFindMany,
    },
  },
}));

vi.mock("@/lib/pricing/catalog", () => ({
  getPricingCatalog: mocks.getPricingCatalog,
}));

vi.mock("@/lib/pricing/resolve", () => ({
  resolveOfficialPricingMatch: mocks.resolveOfficialPricingMatch,
  resolveOfficialPricingProvider: mocks.resolveOfficialPricingProvider,
  estimateCostUsd: mocks.estimateCostUsd,
}));

vi.mock("@/lib/token-counts", () => ({
  tokenCountToNumber: mocks.tokenCountToNumber,
}));

import {
  getActivityTrend,
  getBreakdowns,
  getFilterOptions,
  getHourlyActivityHeatmap,
  getLastSyncedAt,
  getOverviewMetrics,
  getPricingSummaryAndRows,
  getSessionRows,
  getTokenTrend,
} from "./queries";

const range = {
  from: new Date("2026-03-19T00:00:00.000Z"),
  to: new Date("2026-03-25T23:59:59.999Z"),
  granularity: "day" as const,
  preset: "7d" as const,
  timezone: "UTC",
};

describe("getBreakdowns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usageBucketFindMany.mockResolvedValue([]);
    mocks.usageSessionFindMany.mockResolvedValue([]);
    mocks.deviceFindMany.mockResolvedValue([]);
    mocks.usageApiKeyFindMany.mockResolvedValue([]);
    mocks.getPricingCatalog.mockResolvedValue(null);
    mocks.resolveOfficialPricingMatch.mockReturnValue(null);
    mocks.estimateCostUsd.mockReturnValue(null);
  });

  it("disambiguates duplicate device hostnames in the device breakdown", async () => {
    mocks.deviceFindMany.mockResolvedValue([
      {
        deviceId: "11111111-alpha",
        hostname: "Huawei-Matebook-Pro",
      },
      {
        deviceId: "22222222-beta",
        hostname: "Huawei-Matebook-Pro",
      },
    ]);
    mocks.usageBucketFindMany.mockResolvedValue([
      {
        deviceId: "11111111-alpha",
        source: "codex",
        model: "gpt-5.4",
        projectKey: "project-a",
        projectLabel: "project-a",
        totalTokens: 400,
        inputTokens: 120,
        outputTokens: 200,
        reasoningTokens: 40,
        cachedTokens: 40,
      },
      {
        deviceId: "22222222-beta",
        source: "codex",
        model: "gpt-5.4",
        projectKey: "project-b",
        projectLabel: "project-b",
        totalTokens: 300,
        inputTokens: 100,
        outputTokens: 150,
        reasoningTokens: 30,
        cachedTokens: 50,
      },
    ]);

    const breakdowns = await getBreakdowns({
      userId: "user_123",
      range,
      filters: {},
    });

    expect(breakdowns.devices).toHaveLength(2);
    expect(breakdowns.devices.map((row) => row.name)).toEqual([
      "Huawei-Matebook-Pro · 11111111",
      "Huawei-Matebook-Pro · 22222222",
    ]);
  });
});

describe("getFilterOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usageBucketFindMany.mockResolvedValue([]);
    mocks.usageSessionFindMany.mockResolvedValue([]);
    mocks.deviceFindMany.mockResolvedValue([]);
    mocks.usageApiKeyFindMany.mockResolvedValue([]);
    mocks.getPricingCatalog.mockResolvedValue(null);
    mocks.resolveOfficialPricingMatch.mockReturnValue(null);
    mocks.estimateCostUsd.mockReturnValue(null);
  });

  it("disambiguates duplicate device hostnames in filter options", async () => {
    mocks.deviceFindMany.mockResolvedValue([
      {
        deviceId: "11111111-alpha",
        hostname: "Huawei-Matebook-Pro",
      },
      {
        deviceId: "22222222-beta",
        hostname: "Huawei-Matebook-Pro",
      },
    ]);

    const options = await getFilterOptions("user_123");

    expect(options.devices).toEqual([
      {
        value: "11111111-alpha",
        label: "Huawei-Matebook-Pro · 11111111",
      },
      {
        value: "22222222-beta",
        label: "Huawei-Matebook-Pro · 22222222",
      },
    ]);
  });
});

describe("getSessionRows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usageBucketFindMany.mockResolvedValue([]);
    mocks.usageSessionFindMany.mockResolvedValue([]);
    mocks.deviceFindMany.mockResolvedValue([]);
    mocks.usageApiKeyFindMany.mockResolvedValue([]);
    mocks.getPricingCatalog.mockResolvedValue(null);
    mocks.resolveOfficialPricingMatch.mockReturnValue(null);
    mocks.estimateCostUsd.mockReturnValue(null);
  });

  it("returns sessions with disambiguated device labels and estimated cost", async () => {
    mocks.deviceFindMany.mockResolvedValue([
      {
        deviceId: "11111111-alpha",
        hostname: "Huawei-Matebook-Pro",
      },
      {
        deviceId: "22222222-beta",
        hostname: "Huawei-Matebook-Pro",
      },
    ]);
    mocks.usageSessionFindMany.mockResolvedValue([
      {
        id: "session_2",
        sessionHash: "hash_2",
        source: "codex",
        projectKey: "project-b",
        projectLabel: "project-b",
        deviceId: "22222222-beta",
        firstMessageAt: new Date("2026-03-25T12:00:00.000Z"),
        lastMessageAt: new Date("2026-03-25T12:20:00.000Z"),
        durationSeconds: 1200,
        activeSeconds: 900,
        inputTokens: 1000,
        outputTokens: 500,
        reasoningTokens: 200,
        cachedTokens: 100,
        totalTokens: 1800,
        primaryModel: "claude-sonnet-4-20250514",
        estimatedCostUsd: 0.012,
        messageCount: 10,
        userMessageCount: 4,
      },
    ]);

    const sessions = await getSessionRows({
      userId: "user_123",
      range,
      filters: {},
    });

    expect(sessions).toEqual([
      {
        id: "session_2",
        sessionHash: "hash_2",
        source: "codex",
        projectKey: "project-b",
        projectLabel: "project-b",
        deviceId: "22222222-beta",
        deviceLabel: "Huawei-Matebook-Pro · 22222222",
        firstMessageAt: "2026-03-25T12:00:00.000Z",
        lastMessageAt: "2026-03-25T12:20:00.000Z",
        durationSeconds: 1200,
        activeSeconds: 900,
        messageCount: 10,
        userMessageCount: 4,
        estimatedCostUsd: 0.012,
        totalTokens: 1800,
        inputTokens: 1000,
        outputTokens: 500,
        reasoningTokens: 200,
        cachedTokens: 100,
        primaryModel: "claude-sonnet-4-20250514",
      },
    ]);
  });
});

describe("getTokenTrend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usageBucketFindMany.mockResolvedValue([]);
    mocks.usageSessionFindMany.mockResolvedValue([]);
    mocks.deviceFindMany.mockResolvedValue([]);
    mocks.usageApiKeyFindMany.mockResolvedValue([]);
    mocks.getPricingCatalog.mockResolvedValue(new Map());
    mocks.resolveOfficialPricingMatch.mockReturnValue({
      providerId: "openai",
      providerName: "OpenAI",
      modelId: "gpt-5",
      modelName: "GPT-5",
      cost: { input: 1, output: 2 },
    });
    mocks.estimateCostUsd.mockReturnValue({
      totalUsd: 1.5,
      inputUsd: 0.5,
      outputUsd: 1,
      reasoningUsd: 0,
      cacheUsd: 0,
    });
  });

  it("returns token trend points with estimated cost and total duration", async () => {
    mocks.usageBucketFindMany.mockResolvedValue([
      {
        bucketStart: new Date("2026-03-25T00:00:00.000Z"),
        model: "gpt-5",
        inputTokens: 100,
        outputTokens: 200,
        reasoningTokens: 50,
        cachedTokens: 25,
        totalTokens: 375,
      },
    ]);
    mocks.usageSessionFindMany.mockResolvedValue([
      {
        firstMessageAt: new Date("2026-03-25T12:00:00.000Z"),
        durationSeconds: 1200,
      },
    ]);

    const points = await getTokenTrend({
      userId: "user_123",
      range,
      filters: {},
    });

    expect(points).toHaveLength(7);
    expect(points.at(-1)).toMatchObject({
      label: "2026-03-25",
      totalTokens: 375,
      estimatedCostUsd: 1.5,
      totalSeconds: 1200,
    });
  });
});

describe("getHourlyActivityHeatmap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usageBucketFindMany.mockResolvedValue([]);
    mocks.usageSessionFindMany.mockResolvedValue([]);
    mocks.deviceFindMany.mockResolvedValue([]);
    mocks.usageApiKeyFindMany.mockResolvedValue([]);
    mocks.getPricingCatalog.mockResolvedValue(new Map());
    mocks.resolveOfficialPricingMatch.mockReturnValue({
      providerId: "openai",
      providerName: "OpenAI",
      modelId: "gpt-5",
      modelName: "GPT-5",
      cost: { input: 1, output: 2 },
    });
    mocks.estimateCostUsd.mockReturnValue({
      totalUsd: 1.5,
      inputUsd: 0.5,
      outputUsd: 1,
      reasoningUsd: 0,
      cacheUsd: 0,
    });
  });

  it("aggregates buckets and active time by local weekday and hour", async () => {
    mocks.usageBucketFindMany.mockResolvedValue([
      {
        bucketStart: new Date("2026-03-25T01:00:00.000Z"),
        model: "gpt-5",
        inputTokens: 100,
        outputTokens: 40,
        reasoningTokens: 0,
        cachedTokens: 0,
        totalTokens: 140,
      },
    ]);
    mocks.usageSessionFindMany.mockResolvedValue([
      {
        firstMessageAt: new Date("2026-03-25T01:10:00.000Z"),
        activeSeconds: 900,
      },
    ]);

    const cells = await getHourlyActivityHeatmap({
      userId: "user_123",
      range: {
        ...range,
        timezone: "Asia/Shanghai",
      },
      filters: {},
    });

    expect(cells).toHaveLength(7 * 24);
    expect(cells.find((cell) => cell.weekday === 3 && cell.hour === 9)).toEqual(
      {
        weekday: 3,
        hour: 9,
        inputTokens: 100,
        outputTokens: 40,
        totalTokens: 140,
        estimatedCostUsd: 1.5,
        activeSeconds: 900,
        sessions: 1,
      },
    );
  });
});

describe("getOverviewMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usageBucketFindMany.mockResolvedValue([]);
    mocks.usageSessionFindMany.mockResolvedValue([]);
    mocks.deviceFindMany.mockResolvedValue([]);
    mocks.usageApiKeyFindMany.mockResolvedValue([]);
    mocks.getPricingCatalog.mockResolvedValue(null);
    mocks.resolveOfficialPricingMatch.mockReturnValue(null);
    mocks.estimateCostUsd.mockReturnValue(null);
    mocks.tokenCountToNumber.mockImplementation(
      (v: number | bigint | null | undefined) =>
        typeof v === "number" ? v : 0,
    );
  });

  it("returns overview metrics with current and previous deltas", async () => {
    // Current period: 1 bucket + 1 session
    mocks.usageBucketFindMany
      .mockResolvedValueOnce([
        {
          bucketStart: new Date("2026-03-25T00:00:00.000Z"),
          totalTokens: 500,
          inputTokens: 200,
          outputTokens: 200,
          reasoningTokens: 50,
          cachedTokens: 50,
        },
      ])
      // Previous period: empty
      .mockResolvedValueOnce([])
      // For getOverviewMetrics, loadBuckets is called 2x (current + previous)
      // But getTokenTrend etc. not used here
      .mockResolvedValueOnce([]);

    mocks.usageSessionFindMany
      .mockResolvedValueOnce([
        {
          activeSeconds: 600,
          durationSeconds: 1200,
          messageCount: 12,
          userMessageCount: 5,
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await getOverviewMetrics({
      userId: "user_123",
      range,
      filters: {},
    });

    // current totalTokens=500, previous=0, delta=500
    expect(result.totalTokens).toEqual({
      current: 500,
      previous: 0,
      delta: 500,
    });
    // current sessions=1, previous=0
    expect(result.sessions).toEqual({
      current: 1,
      previous: 0,
      delta: 1,
    });
    expect(result.messages).toEqual({
      current: 12,
      previous: 0,
      delta: 12,
    });
  });
});

describe("getActivityTrend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usageBucketFindMany.mockResolvedValue([]);
    mocks.usageSessionFindMany.mockResolvedValue([]);
    mocks.deviceFindMany.mockResolvedValue([]);
    mocks.usageApiKeyFindMany.mockResolvedValue([]);
    mocks.getPricingCatalog.mockResolvedValue(null);
    mocks.resolveOfficialPricingMatch.mockReturnValue(null);
    mocks.estimateCostUsd.mockReturnValue(null);
    mocks.tokenCountToNumber.mockImplementation(
      (v: number | bigint | null | undefined) =>
        typeof v === "number" ? v : 0,
    );
  });

  it("returns activity trend points aggregated by session data", async () => {
    mocks.usageSessionFindMany.mockResolvedValue([
      {
        firstMessageAt: new Date("2026-03-25T12:00:00.000Z"),
        activeSeconds: 300,
        durationSeconds: 900,
        messageCount: 8,
        userMessageCount: 3,
      },
    ]);

    const points = await getActivityTrend({
      userId: "user_123",
      range,
      filters: {},
    });

    // 7 days range => 7 points
    expect(points).toHaveLength(7);
    const lastPoint = points.at(-1);
    expect(lastPoint).toMatchObject({
      label: "2026-03-25",
      activeSeconds: 300,
      totalSeconds: 900,
      sessions: 1,
      messages: 8,
      userMessages: 3,
    });
  });
});

describe("getPricingSummaryAndRows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usageBucketFindMany.mockResolvedValue([]);
    mocks.usageSessionFindMany.mockResolvedValue([]);
    mocks.deviceFindMany.mockResolvedValue([]);
    mocks.usageApiKeyFindMany.mockResolvedValue([]);
    mocks.getPricingCatalog.mockResolvedValue(new Map());
    mocks.resolveOfficialPricingMatch.mockReturnValue(null);
    mocks.resolveOfficialPricingProvider.mockReturnValue(null);
    mocks.estimateCostUsd.mockReturnValue(null);
    mocks.tokenCountToNumber.mockImplementation(
      (v: number | bigint | null | undefined) =>
        typeof v === "number" ? v : 0,
    );
  });

  it("returns empty pricing summary when no buckets exist", async () => {
    const result = await getPricingSummaryAndRows({
      userId: "user_123",
      range,
      filters: {},
    });

    expect(result.modelPricingRows).toHaveLength(0);
    expect(result.summary.currentUsd).toBe(0);
    expect(result.summary.previousUsd).toBe(0);
    expect(result.summary.deltaUsd).toBe(0);
    expect(result.summary.coverage).toBe(0);
    expect(result.summary.pricedModels).toBe(0);
    expect(result.summary.totalModels).toBe(0);
  });

  it("returns pricing summary with model rows when data exists", async () => {
    mocks.resolveOfficialPricingMatch.mockReturnValue({
      providerId: "openai",
      providerName: "OpenAI",
      modelId: "gpt-5",
      modelName: "GPT-5",
      cost: { input: 2, output: 8 },
    });
    mocks.resolveOfficialPricingProvider.mockReturnValue({
      providerId: "openai",
      providerName: "OpenAI",
    });
    mocks.estimateCostUsd.mockReturnValue({
      totalUsd: 0.5,
      inputUsd: 0.1,
      outputUsd: 0.3,
      reasoningUsd: 0.05,
      cacheUsd: 0.05,
    });

    // Use mockImplementationOnce to control the order:
    // First call = current buckets, second call = previous buckets
    mocks.usageBucketFindMany
      .mockImplementationOnce(() =>
        Promise.resolve([
          {
            model: "gpt-5",
            totalTokens: 1000,
            inputTokens: 500,
            outputTokens: 400,
            reasoningTokens: 50,
            cachedTokens: 50,
            bucketStart: new Date("2026-03-25T00:00:00.000Z"),
            userId: "user_123",
            deviceId: "device-1",
            source: "codex",
            projectKey: "proj-1",
            projectLabel: "Project 1",
          },
        ]),
      )
      .mockImplementationOnce(() => Promise.resolve([]));

    const result = await getPricingSummaryAndRows({
      userId: "user_123",
      range,
      filters: {},
    });

    expect(result.modelPricingRows).toHaveLength(1);
    expect(result.modelPricingRows[0].rawModel).toBe("gpt-5");
    expect(result.modelPricingRows[0].estimatedCostUsd).toBe(0.5);
    expect(result.summary.currentUsd).toBe(0.5);
    expect(result.summary.previousUsd).toBe(0);
    expect(result.summary.deltaUsd).toBe(0.5);
    expect(result.summary.coverage).toBe(1);
    expect(result.summary.pricedModels).toBe(1);
    expect(result.summary.totalModels).toBe(1);
  });
});

describe("getLastSyncedAt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usageBucketFindMany.mockResolvedValue([]);
    mocks.usageSessionFindMany.mockResolvedValue([]);
    mocks.deviceFindMany.mockResolvedValue([]);
    mocks.usageApiKeyFindMany.mockResolvedValue([]);
    mocks.getPricingCatalog.mockResolvedValue(null);
    mocks.resolveOfficialPricingMatch.mockReturnValue(null);
    mocks.estimateCostUsd.mockReturnValue(null);
    mocks.tokenCountToNumber.mockImplementation(
      (v: number | bigint | null | undefined) =>
        typeof v === "number" ? v : 0,
    );
  });

  it("returns the most recent updatedAt timestamp across sources", async () => {
    const bucketDate = new Date("2026-03-24T10:00:00.000Z");
    const sessionDate = new Date("2026-03-25T15:00:00.000Z");
    const deviceDate = new Date("2026-03-23T08:00:00.000Z");

    mocks.usageBucketFindFirst.mockResolvedValue({
      updatedAt: bucketDate,
    });
    mocks.usageSessionFindFirst.mockResolvedValue({
      updatedAt: sessionDate,
    });
    mocks.deviceFindFirst.mockResolvedValue({
      lastSeenAt: deviceDate,
    });

    const result = await getLastSyncedAt("user_123");

    // sessionDate is the latest
    expect(result).toEqual(sessionDate);
  });

  it("returns null when all sources have no records", async () => {
    mocks.usageBucketFindFirst.mockResolvedValue(null);
    mocks.usageSessionFindFirst.mockResolvedValue(null);
    mocks.deviceFindFirst.mockResolvedValue(null);

    const result = await getLastSyncedAt("user_123");

    expect(result).toBeNull();
  });
});
