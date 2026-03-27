import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getSessionOrRedirect: vi.fn(),
  listUsageApiKeys: vi.fn(),
  getUsagePreference: vi.fn(),
  formatDateTime: vi.fn(),
  getOverviewMetrics: vi.fn(),
  getTokenTrend: vi.fn(),
  getActivityTrend: vi.fn(),
  getBreakdowns: vi.fn(),
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
  BreakdownTabs: vi.fn(() =>
    React.createElement("div", { "data-slot": "breakdown-tabs" }),
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
  SettingsDialog: vi.fn(() =>
    React.createElement("div", { "data-slot": "settings-dialog" }),
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
  ActivityTrendCard: vi.fn(() =>
    React.createElement("div", { "data-slot": "activity-trend-card" }),
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
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

vi.mock("@/components/usage/activity-trend-card", () => ({
  ActivityTrendCard: mocks.ActivityTrendCard,
}));

vi.mock("@/components/usage/breakdown-tabs", () => ({
  BreakdownTabs: mocks.BreakdownTabs,
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

vi.mock("@/components/usage/settings-dialog", () => ({
  SettingsDialog: mocks.SettingsDialog,
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

vi.mock("@/lib/usage/api-keys", () => ({
  listUsageApiKeys: mocks.listUsageApiKeys,
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
  getActivityTrend: mocks.getActivityTrend,
  getBreakdowns: mocks.getBreakdowns,
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
      },
    ]);
    mocks.getActivityTrend.mockResolvedValue([
      {
        label: "2026-03-24",
        start: "2026-03-24T00:00:00.000Z",
        activeSeconds: 100,
        totalSeconds: 120,
        sessions: 2,
        messages: 10,
        userMessages: 5,
      },
    ]);
    mocks.getBreakdowns.mockResolvedValue({
      devices: [],
      tools: [],
      models: [],
      projects: [],
    });
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
    mocks.listUsageApiKeys.mockResolvedValue([]);
    mocks.formatDateTime.mockReturnValue("2026-03-26 00:00");
  });

  it("renders the token trend without requesting or rendering the activity trend card", async () => {
    const { default: UsagePage } = await import("@/app/[locale]/usage/page");

    const markup = renderToStaticMarkup(
      await UsagePage({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({ preset: "7d" }),
      }),
    );

    expect(mocks.getActivityTrend).not.toHaveBeenCalled();
    expect(mocks.TokenTrendCard).toHaveBeenCalledOnce();
    expect(mocks.ActivityTrendCard).not.toHaveBeenCalled();
    expect(markup).toContain('data-slot="token-trend-card"');
    expect(markup).not.toContain('data-slot="activity-trend-card"');
  });
});
