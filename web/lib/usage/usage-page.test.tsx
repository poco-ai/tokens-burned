import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getSessionOrRedirect: vi.fn(),
  getUsagePreference: vi.fn(),
  formatDateTime: vi.fn(),
  getOverviewMetrics: vi.fn(),
  getTokenTrend: vi.fn(),
  getActivityHeatmap365: vi.fn(),
  getBreakdowns: vi.fn(),
  getPricingSummaryAndRows: vi.fn(),
  getSessionRows: vi.fn(),
  getFilterOptions: vi.fn(),
  getLastSyncedAt: vi.fn(),
  resolveDashboardRange: vi.fn(),
  getTranslations: vi.fn(
    async () => (key: string, values?: Record<string, string>) => {
      if (key === "overviewTitle") return "Overview";
      if (key === "noSyncYet") return "No sync yet";
      if (key === "lastSynced")
        return `Last synced ${values?.value ?? ""}`.trim();
      return key;
    },
  ),
  AppShell: vi.fn(({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-slot": "app-shell" }, children),
  ),
  AccountMenu: vi.fn(() =>
    React.createElement("div", { "data-slot": "account-menu" }),
  ),
  BreakdownGrid: vi.fn(() =>
    React.createElement("div", { "data-slot": "breakdown-grid" }),
  ),
  EmptyState: vi.fn(() =>
    React.createElement("div", { "data-slot": "empty-state" }),
  ),
  FiltersBar: vi.fn(() =>
    React.createElement("div", { "data-slot": "filters-bar" }),
  ),
  KpiGrid: vi.fn(() => React.createElement("div", { "data-slot": "kpi-grid" })),
  UsagePageShell: vi.fn(({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-slot": "page-shell" }, children),
  ),
  SessionsSection: vi.fn(() =>
    React.createElement("div", { "data-slot": "sessions-section" }),
  ),
  LanguageSwitcher: vi.fn(() =>
    React.createElement("div", { "data-slot": "language-switcher" }),
  ),
  ThemeSwitcher: vi.fn(() =>
    React.createElement("div", { "data-slot": "theme-switcher" }),
  ),
  TokenTrendCard: vi.fn(() =>
    React.createElement("div", { "data-slot": "token-trend-card" }),
  ),
  ProfileHeatmap: vi.fn(() =>
    React.createElement("div", { "data-slot": "profile-heatmap" }),
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: mocks.getTranslations,
}));

vi.mock("@/components/app/app-shell", () => ({
  AppShell: mocks.AppShell,
}));

vi.mock("@/components/usage/account-menu", () => ({
  AccountMenu: mocks.AccountMenu,
}));

vi.mock("@/components/social/profile-heatmap", () => ({
  ProfileHeatmap: mocks.ProfileHeatmap,
}));

vi.mock("@/lib/social/queries", () => ({
  getActivityHeatmap365: mocks.getActivityHeatmap365,
}));

vi.mock("@/components/usage/breakdown-grid", () => ({
  BreakdownGrid: mocks.BreakdownGrid,
}));

vi.mock("@/components/usage/empty-state", () => ({
  EmptyState: mocks.EmptyState,
}));

vi.mock("@/components/usage/filters-bar", () => ({
  FiltersBar: mocks.FiltersBar,
}));

vi.mock("@/components/usage/kpi-grid", () => ({
  KpiGrid: mocks.KpiGrid,
}));

vi.mock("@/components/usage/page-shell", () => ({
  UsagePageShell: mocks.UsagePageShell,
}));

vi.mock("@/components/usage/sessions-section", () => ({
  SessionsSection: mocks.SessionsSection,
}));

vi.mock("@/components/shared/language-switcher", () => ({
  LanguageSwitcher: mocks.LanguageSwitcher,
}));

vi.mock("@/components/shared/theme-switcher", () => ({
  ThemeSwitcher: mocks.ThemeSwitcher,
}));

vi.mock("@/components/usage/token-trend-card", () => ({
  TokenTrendCard: mocks.TokenTrendCard,
}));

vi.mock("@/lib/session", () => ({
  getSessionOrRedirect: mocks.getSessionOrRedirect,
}));

vi.mock("@/lib/usage/date-range", () => ({
  resolveDashboardRange: mocks.resolveDashboardRange,
}));

vi.mock("@/lib/usage/format", () => ({
  formatDateTime: mocks.formatDateTime,
}));

vi.mock("@/lib/usage/preferences", () => ({
  getUsagePreference: mocks.getUsagePreference,
}));

vi.mock("@/lib/usage/queries", () => ({
  getOverviewMetrics: mocks.getOverviewMetrics,
  getTokenTrend: mocks.getTokenTrend,
  getBreakdowns: mocks.getBreakdowns,
  getPricingSummaryAndRows: mocks.getPricingSummaryAndRows,
  getSessionRows: mocks.getSessionRows,
  getFilterOptions: mocks.getFilterOptions,
  getLastSyncedAt: mocks.getLastSyncedAt,
}));

describe("UsagePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionOrRedirect.mockResolvedValue({
      user: {
        id: "user_123",
        email: "user@example.com",
        username: "test_user",
      },
    });
    mocks.getUsagePreference.mockResolvedValue({
      locale: "en",
      theme: "system",
      timezone: "Asia/Shanghai",
      projectMode: "hashed",
    });
    mocks.resolveDashboardRange.mockReturnValue({
      from: new Date("2026-03-19T00:00:00.000Z"),
      to: new Date("2026-03-25T23:59:59.999Z"),
      granularity: "day",
      preset: "7d",
      timezone: "Asia/Shanghai",
    });
    mocks.getOverviewMetrics.mockResolvedValue({
      totalTokens: { current: 1, previous: 0, delta: 1 },
      inputTokens: { current: 1, previous: 0, delta: 1 },
      outputTokens: { current: 0, previous: 0, delta: 0 },
      reasoningTokens: { current: 0, previous: 0, delta: 0 },
      cachedTokens: { current: 0, previous: 0, delta: 0 },
      activeSeconds: { current: 0, previous: 0, delta: 0 },
      totalSeconds: { current: 0, previous: 0, delta: 0 },
      sessions: { current: 0, previous: 0, delta: 0 },
      messages: { current: 0, previous: 0, delta: 0 },
      userMessages: { current: 0, previous: 0, delta: 0 },
    });
    mocks.getTokenTrend.mockResolvedValue([
      {
        label: "2026-03-24",
        start: "2026-03-24T00:00:00.000Z",
        totalTokens: 120,
        inputTokens: 60,
        outputTokens: 40,
        reasoningTokens: 10,
        cachedTokens: 10,
        estimatedCostUsd: 1.25,
        totalSeconds: 120,
      },
    ]);
    mocks.getActivityHeatmap365.mockResolvedValue([]);
    mocks.getBreakdowns.mockResolvedValue({
      devices: [],
      tools: [],
      models: [],
      projects: [],
    });
    mocks.getPricingSummaryAndRows.mockResolvedValue({
      summary: {
        currentUsd: 1.25,
        previousUsd: 0.75,
        deltaUsd: 0.5,
        pricedTokens: 120,
        totalTokens: 120,
        coverage: 1,
        pricedModels: 1,
        totalModels: 1,
      },
      modelPricingRows: [],
    });
    mocks.getSessionRows.mockResolvedValue([]);
    mocks.getFilterOptions.mockResolvedValue({
      apiKeys: [],
      devices: [],
      sources: [],
      models: [],
      projects: [],
    });
    mocks.getLastSyncedAt.mockResolvedValue(
      new Date("2026-03-25T16:00:00.000Z"),
    );
    mocks.formatDateTime.mockReturnValue("2026-03-26 00:00");
  });

  it("renders the profile heatmap and token trend", async () => {
    const { default: UsagePage } = await import("@/app/[locale]/usage/page");

    const markup = renderToStaticMarkup(
      await UsagePage({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({ preset: "7d" }),
      }),
    );

    expect(mocks.getActivityHeatmap365).toHaveBeenCalledWith({
      userId: "user_123",
      timezone: "Asia/Shanghai",
    });
    expect(mocks.ProfileHeatmap).toHaveBeenCalledOnce();
    expect(mocks.TokenTrendCard).toHaveBeenCalledOnce();
    expect(mocks.SessionsSection).toHaveBeenCalledOnce();
    expect(mocks.getSessionRows).toHaveBeenCalledOnce();
    expect(mocks.KpiGrid).toHaveBeenCalledWith(
      expect.objectContaining({
        modelPricingRows: [],
      }),
      undefined,
    );
    expect(markup).toContain('data-slot="profile-heatmap"');
    expect(markup).toContain('data-slot="token-trend-card"');
    expect(markup).toContain('data-slot="sessions-section"');
  });
});
