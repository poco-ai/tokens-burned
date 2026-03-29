import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usageBucketFindMany: vi.fn(),
  usageSessionFindMany: vi.fn(),
  deviceFindMany: vi.fn(),
  usageApiKeyFindMany: vi.fn(),
  getPricingCatalog: vi.fn(),
  resolveOfficialPricingMatch: vi.fn(),
  estimateCostUsd: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    usageBucket: {
      findMany: mocks.usageBucketFindMany,
    },
    usageSession: {
      findMany: mocks.usageSessionFindMany,
    },
    device: {
      findMany: mocks.deviceFindMany,
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
  estimateCostUsd: mocks.estimateCostUsd,
}));

import {
  getBreakdowns,
  getFilterOptions,
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

  it("returns sessions with disambiguated device labels", async () => {
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
