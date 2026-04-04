import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findManyBuckets: vi.fn(),
  aggregateSessions: vi.fn(),
  findManySessions: vi.fn(),
  getPricingCatalog: vi.fn(),
  resolveOfficialPricingMatch: vi.fn(),
  estimateCostUsd: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
    },
    usageBucket: {
      findMany: mocks.findManyBuckets,
    },
    usageSession: {
      aggregate: mocks.aggregateSessions,
      findMany: mocks.findManySessions,
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

describe("social badges", () => {
  it("aggregates public badge data and computes streak", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user_1",
      username: "alice",
      usagePreference: {
        publicProfileEnabled: true,
        timezone: "UTC",
      },
    });
    mocks.getPricingCatalog.mockResolvedValue({});
    mocks.findManyBuckets.mockResolvedValue([
      {
        bucketStart: new Date("2026-04-01T12:00:00.000Z"),
        totalTokens: 1000n,
        model: "gpt-x",
        inputTokens: 600n,
        outputTokens: 300n,
        reasoningTokens: 50n,
        cachedTokens: 50n,
      },
      {
        bucketStart: new Date("2026-04-02T12:00:00.000Z"),
        totalTokens: 500n,
        model: "gpt-x",
        inputTokens: 250n,
        outputTokens: 200n,
        reasoningTokens: 25n,
        cachedTokens: 25n,
      },
    ]);
    mocks.aggregateSessions.mockResolvedValue({
      _sum: {
        activeSeconds: 7200,
        durationSeconds: 14400,
      },
      _count: {
        _all: 3,
      },
    });
    mocks.findManySessions.mockResolvedValue([
      { firstMessageAt: new Date("2026-04-01T09:00:00.000Z") },
      { firstMessageAt: new Date("2026-04-02T09:00:00.000Z") },
      { firstMessageAt: new Date("2026-04-03T09:00:00.000Z") },
    ]);
    mocks.resolveOfficialPricingMatch.mockReturnValue({
      cost: { input: 0, output: 0, reasoning: 0, cache: 0 },
    });
    mocks.estimateCostUsd
      .mockReturnValueOnce({ totalUsd: 1.25 })
      .mockReturnValueOnce({ totalUsd: 0.75 });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T13:00:00.000Z"));

    const { getPublicBadgeData } = await import("@/lib/social/badges");
    const result = await getPublicBadgeData({ username: "Alice" });

    expect(result).toEqual({
      kind: "ok",
      data: expect.objectContaining({
        username: "alice",
        totalTokens: 1500,
        estimatedCostUsd: 2,
        activeSeconds: 7200,
        totalSeconds: 14400,
        sessions: 3,
        currentStreakDays: 3,
      }),
    });

    vi.useRealTimers();
  });

  it("returns private state without leaking aggregates", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user_2",
      username: "private_user",
      usagePreference: {
        publicProfileEnabled: false,
        timezone: "UTC",
      },
    });
    mocks.findManyBuckets.mockClear();

    const { getPublicBadgeData } = await import("@/lib/social/badges");
    const result = await getPublicBadgeData({ username: "private_user" });

    expect(result).toEqual({
      kind: "private",
      username: "private_user",
    });
    expect(mocks.findManyBuckets).not.toHaveBeenCalled();
  });

  it("renders svg badge output", async () => {
    const { TOKEN_ARENA_LOGO_PATHS, parsePublicBadgeStyle, renderBadgeSvg } =
      await import("@/lib/social/badges");

    const svg = renderBadgeSvg(
      {
        kind: "ok",
        data: {
          username: "alice",
          publicProfileEnabled: true,
          totalTokens: 1_250_000,
          estimatedCostUsd: 12.3,
          activeSeconds: 3600 * 48,
          totalSeconds: 3600 * 60,
          sessions: 10,
          currentStreakDays: 7,
        },
      },
      {
        metric: "tokens",
        theme: "dark",
        style: "for-the-badge",
      },
    );

    expect(svg).toContain("<svg");
    expect(svg).toContain("TokenArena tokens: 1.3M");
    expect(svg).toContain(">tokens<");
    expect(svg).toContain("1.3M");
    expect(svg).toContain('height="28"');
    expect(svg).toContain(TOKEN_ARENA_LOGO_PATHS.primary.slice(0, 40));
    expect(parsePublicBadgeStyle("plastic")).toBe("plastic");
    expect(parsePublicBadgeStyle("flat-square")).toBe("flat-square");
    expect(parsePublicBadgeStyle("rounded")).toBe("flat");
  });

  it("matches shields-like compact sizing for flat badges", async () => {
    const { renderBadgeSvg } = await import("@/lib/social/badges");

    const svg = renderBadgeSvg(
      {
        kind: "ok",
        data: {
          username: "alice",
          publicProfileEnabled: true,
          totalTokens: 123,
          estimatedCostUsd: 1.2,
          activeSeconds: 3600,
          totalSeconds: 3600,
          sessions: 1,
          currentStreakDays: 3,
        },
      },
      {
        metric: "tokens",
        theme: "dark",
        style: "flat",
      },
    );

    expect(svg).toContain('height="20"');
    const width = Number(svg.match(/width="([0-9]+)"/)?.[1] ?? "0");
    expect(width).toBeGreaterThanOrEqual(96);
  });
});
