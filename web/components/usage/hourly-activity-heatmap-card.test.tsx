import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { HourlyActivityHeatmapCard } from "./hourly-activity-heatmap-card";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, number>) =>
    ({
      description: "Summed by local weekday and hour across the current range.",
      "views.tokens": "Token",
      "views.cost": "Cost",
      "views.activeTime": "Time",
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
      less: "Less",
      more: "More",
      emptyCost: "No priced usage in this range.",
    })[key] ?? key,
}));

describe("HourlyActivityHeatmapCard", () => {
  const data = Array.from({ length: 7 * 24 }, (_, index) => ({
    weekday: Math.floor(index / 24),
    hour: index % 24,
    inputTokens: index === 0 ? 1200 : 0,
    outputTokens: index === 0 ? 800 : 0,
    totalTokens: index === 0 ? 2000 : 0,
    estimatedCostUsd: index === 0 ? 1.25 : 0,
    activeSeconds: index === 0 ? 540 : 0,
    sessions: index === 0 ? 3 : 0,
  }));

  it("renders the metric controls, weekday labels, and legend", () => {
    const markup = renderToStaticMarkup(
      <HourlyActivityHeatmapCard data={data} />,
    );

    expect(markup).toContain("Token");
    expect(markup).toContain("Cost");
    expect(markup).toContain("Time");
    expect(markup).toContain("Sun");
    expect(markup).toContain("Mon");
    expect(markup).toContain("Less");
    expect(markup).toContain("More");
    expect(markup).toContain("Sun 00:00");
    expect(markup).toContain("Tokens 2K");
    expect(markup).toContain("3 sessions");
  });

  it("shows the empty cost notice when the cost view has no priced data", () => {
    const markup = renderToStaticMarkup(
      <HourlyActivityHeatmapCard
        defaultMetric="estimatedCostUsd"
        data={data.map((cell) => ({ ...cell, estimatedCostUsd: 0 }))}
      />,
    );

    expect(markup).toContain("No priced usage in this range.");
  });
});
