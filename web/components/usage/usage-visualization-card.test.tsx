import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { UsageVisualizationCard } from "./usage-visualization-card";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    (namespace?: string) => (key: string, values?: Record<string, number>) => {
      const trendMessages = {
        title: "Daily Trend",
        total: "Total",
        cache: "Cache",
        input: "Input",
        output: "Output",
        reasoning: "Reasoning",
        cost: "Est. Cost",
        totalTime: "Total Time",
        emptyCost: "No priced usage in this range.",
        "views.tokens": "Tokens",
        "views.cost": "Cost",
        "views.totalTime": "Time",
      } as const;

      const heatmapMessages = {
        title: "Hourly Activity",
        less: "Less",
        more: "More",
        emptyCost: "No priced usage in this range.",
        "metrics.totalTokens": "Tokens",
        "metrics.estimatedCostUsd": "Est. Cost",
        "metrics.activeSeconds": "Time",
        "weekdays.sun": "Sun",
        "weekdays.mon": "Mon",
        "weekdays.tue": "Tue",
        "weekdays.wed": "Wed",
        "weekdays.thu": "Thu",
        "weekdays.fri": "Fri",
        "weekdays.sat": "Sat",
        sessions: `${values?.count ?? 0} sessions`,
      } as const;

      const messages =
        namespace === "usage.hourlyHeatmap" ? heatmapMessages : trendMessages;

      return messages[key as keyof typeof messages] ?? key;
    },
}));

describe("UsageVisualizationCard", () => {
  const trendData = [
    {
      label: "2026-03-24",
      start: "2026-03-24T00:00:00.000Z",
      totalTokens: 1500000,
      inputTokens: 700000,
      outputTokens: 500000,
      reasoningTokens: 200000,
      cachedTokens: 100000,
      estimatedCostUsd: 12.5,
      totalSeconds: 3600,
    },
  ];

  const heatmapData = Array.from({ length: 7 * 24 }, (_, index) => ({
    weekday: Math.floor(index / 24),
    hour: index % 24,
    inputTokens: index === 0 ? 1200 : 0,
    outputTokens: index === 0 ? 800 : 0,
    totalTokens: index === 0 ? 2000 : 0,
    estimatedCostUsd: index === 0 ? 1.25 : 0,
    activeSeconds: index === 0 ? 540 : 0,
    sessions: index === 0 ? 3 : 0,
  }));

  it("renders the default trend view with the mode and metric controls", () => {
    const markup = renderToStaticMarkup(
      <UsageVisualizationCard
        trendData={trendData}
        heatmapData={heatmapData}
      />,
    );
    const dailyTrendIndex = markup.indexOf("Daily Trend");
    const cacheIndex = markup.indexOf("Cache");
    const costIndex = markup.indexOf("Cost");

    expect(markup).toContain("Daily Trend");
    expect(markup).toContain("Hourly Activity");
    expect(markup).toContain("Tokens");
    expect(markup).toContain("Cost");
    expect(markup).toContain("Time");
    expect(markup).toContain("Cache");
    expect(markup).toContain("Input");
    expect(markup).toContain("Output");
    expect(markup).toContain("Reasoning");
    expect(dailyTrendIndex).toBeGreaterThan(-1);
    expect(cacheIndex).toBeGreaterThan(dailyTrendIndex);
    expect(costIndex).toBeGreaterThan(cacheIndex);
  });

  it("renders the heatmap view and bottom legend", () => {
    const markup = renderToStaticMarkup(
      <UsageVisualizationCard
        defaultMode="heatmap"
        trendData={trendData}
        heatmapData={heatmapData}
      />,
    );

    expect(markup).toContain("Less");
    expect(markup).toContain("More");
    expect(markup).toContain("Sun 00:00");
    expect(markup).toContain("Tokens 2K");
    expect(markup).toContain("3 sessions");
  });

  it("shows the empty cost state in heatmap mode when no priced data exists", () => {
    const markup = renderToStaticMarkup(
      <UsageVisualizationCard
        defaultMode="heatmap"
        defaultMetricView="cost"
        trendData={trendData}
        heatmapData={heatmapData.map((cell) => ({
          ...cell,
          estimatedCostUsd: 0,
        }))}
      />,
    );

    expect(markup).toContain("No priced usage in this range.");
  });
});
