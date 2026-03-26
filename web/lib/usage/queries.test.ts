import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usageBucketFindMany: vi.fn(),
  usageSessionFindMany: vi.fn(),
  deviceFindMany: vi.fn(),
  usageApiKeyFindMany: vi.fn(),
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

import { getBreakdowns, getFilterOptions } from "./queries";

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
