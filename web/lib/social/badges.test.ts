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

function makeBadgeData(overrides: Record<string, unknown> = {}) {
  return {
    username: "alice",
    publicProfileEnabled: true,
    totalTokens: 1500,
    estimatedCostUsd: 2,
    activeSeconds: 7200,
    totalSeconds: 14400,
    sessions: 3,
    currentStreakDays: 3,
    ...overrides,
  };
}

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
        totalTokens: BigInt(1000),
        model: "gpt-x",
        inputTokens: BigInt(600),
        outputTokens: BigInt(300),
        reasoningTokens: BigInt(50),
        cachedTokens: BigInt(50),
      },
      {
        bucketStart: new Date("2026-04-02T12:00:00.000Z"),
        totalTokens: BigInt(500),
        model: "gpt-x",
        inputTokens: BigInt(250),
        outputTokens: BigInt(200),
        reasoningTokens: BigInt(25),
        cachedTokens: BigInt(25),
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

  // ---- New tests added for coverage ----

  it("formatShortNumber edge cases via renderBadgeSvg", async () => {
    const { renderBadgeSvg } = await import("@/lib/social/badges");

    const billionSvg = renderBadgeSvg(
      { kind: "ok", data: makeBadgeData({ totalTokens: 2_500_000_000 }) },
      { metric: "tokens", theme: "dark", style: "flat" },
    );
    expect(billionSvg).toContain("2.5B");

    const smallSvg = renderBadgeSvg(
      { kind: "ok", data: makeBadgeData({ totalTokens: 42 }) },
      { metric: "tokens", theme: "dark", style: "flat" },
    );
    expect(smallSvg).toContain(">42<");

    const thousandsSvg = renderBadgeSvg(
      { kind: "ok", data: makeBadgeData({ totalTokens: 15_000 }) },
      { metric: "tokens", theme: "dark", style: "flat" },
    );
    expect(thousandsSvg).toContain("15K");
  });

  it("formatShortUsd edge cases via renderBadgeSvg", async () => {
    const { renderBadgeSvg } = await import("@/lib/social/badges");

    const zeroSvg = renderBadgeSvg(
      { kind: "ok", data: makeBadgeData({ estimatedCostUsd: 0 }) },
      { metric: "cost", theme: "dark", style: "flat" },
    );
    expect(zeroSvg).toContain("$0");

    const tinySvg = renderBadgeSvg(
      { kind: "ok", data: makeBadgeData({ estimatedCostUsd: 0.005 }) },
      { metric: "cost", theme: "dark", style: "flat" },
    );
    expect(tinySvg).toContain("$0.005");

    const midSvg = renderBadgeSvg(
      { kind: "ok", data: makeBadgeData({ estimatedCostUsd: 12.34 }) },
      { metric: "cost", theme: "dark", style: "flat" },
    );
    expect(midSvg).toContain("$12.3");

    const largeSvg = renderBadgeSvg(
      { kind: "ok", data: makeBadgeData({ estimatedCostUsd: 5_000 }) },
      { metric: "cost", theme: "dark", style: "flat" },
    );
    expect(largeSvg).toMatch(/\$5\.?0?K/i);
  });

  it("parsePublicBadgeMetric returns valid metrics and null for invalid", async () => {
    const { parsePublicBadgeMetric } = await import("@/lib/social/badges");

    expect(parsePublicBadgeMetric("streak")).toBe("streak");
    expect(parsePublicBadgeMetric("tokens")).toBe("tokens");
    expect(parsePublicBadgeMetric("active_time")).toBe("active_time");
    expect(parsePublicBadgeMetric("total_time")).toBe("total_time");
    expect(parsePublicBadgeMetric("cost")).toBe("cost");
    expect(parsePublicBadgeMetric("unknown")).toBeNull();
    expect(parsePublicBadgeMetric("")).toBeNull();
    expect(parsePublicBadgeMetric(null)).toBeNull();
    expect(parsePublicBadgeMetric(undefined)).toBeNull();
  });

  it("parsePublicBadgeTheme returns light/dark correctly", async () => {
    const { parsePublicBadgeTheme } = await import("@/lib/social/badges");

    expect(parsePublicBadgeTheme("light")).toBe("light");
    expect(parsePublicBadgeTheme("dark")).toBe("dark");
    expect(parsePublicBadgeTheme("blue")).toBe("dark");
    expect(parsePublicBadgeTheme("")).toBe("dark");
    expect(parsePublicBadgeTheme(null)).toBe("dark");
    expect(parsePublicBadgeTheme(undefined)).toBe("dark");
  });

  it("renders badge SVG for not_found status", async () => {
    const { renderBadgeSvg } = await import("@/lib/social/badges");

    const svg = renderBadgeSvg(
      { kind: "not_found", username: "ghost_user" },
      { metric: "tokens", theme: "dark", style: "flat" },
    );

    expect(svg).toContain("<svg");
    expect(svg).toContain("not found");
    expect(svg).toContain(">tokens<");
  });

  it("renders badge SVG for private status", async () => {
    const { renderBadgeSvg } = await import("@/lib/social/badges");

    const svg = renderBadgeSvg(
      { kind: "private", username: "hidden_user" },
      { metric: "cost", theme: "dark", style: "flat" },
    );

    expect(svg).toContain("<svg");
    expect(svg).toContain("private");
    expect(svg).toContain(">cost<");
  });

  it("renders badge SVG with light theme", async () => {
    const { renderBadgeSvg } = await import("@/lib/social/badges");

    const svg = renderBadgeSvg(
      { kind: "ok", data: makeBadgeData() },
      { metric: "tokens", theme: "light", style: "flat" },
    );

    expect(svg).toContain('fill="#f5f5f5"');
    expect(svg).toContain('fill="#252525"');
    expect(svg).toContain('fill="#fafafa"');
  });

  it("renders different metric types correctly", async () => {
    const { renderBadgeSvg } = await import("@/lib/social/badges");

    const streakSvg = renderBadgeSvg(
      { kind: "ok", data: makeBadgeData({ currentStreakDays: 14 }) },
      { metric: "streak", theme: "dark", style: "flat" },
    );
    expect(streakSvg).toContain(">14d<");
    expect(streakSvg).toContain(">streak<");

    const activeSvg = renderBadgeSvg(
      { kind: "ok", data: makeBadgeData({ activeSeconds: 7200 }) },
      { metric: "active_time", theme: "dark", style: "flat" },
    );
    expect(activeSvg).toContain(">2h<");
    expect(activeSvg).toContain(">active<");

    const totalSvg = renderBadgeSvg(
      { kind: "ok", data: makeBadgeData({ totalSeconds: 3600 * 25 }) },
      { metric: "total_time", theme: "dark", style: "flat" },
    );
    expect(totalSvg).toContain(">1d<");
    expect(totalSvg).toContain(">total<");

    const costSvg = renderBadgeSvg(
      { kind: "ok", data: makeBadgeData({ estimatedCostUsd: 3.5 }) },
      { metric: "cost", theme: "dark", style: "flat" },
    );
    expect(costSvg).toContain(">$3.50<");
    expect(costSvg).toContain(">cost<");
  });
});
