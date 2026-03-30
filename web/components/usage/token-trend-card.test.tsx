import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TokenTrendCard, TokenTrendTooltipContent } from "./token-trend-card";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) =>
    ({
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
      "summary.tokens": "Tokens",
      "summary.cost": "Cost",
      "summary.totalTime": "Time",
    })[key] ?? key,
}));

describe("TokenTrendCard", () => {
  it("renders token view with the inline legend and view controls", () => {
    const markup = renderToStaticMarkup(
      <TokenTrendCard
        data={[
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
        ]}
      />,
    );

    expect(markup).toContain("Tokens");
    expect(markup).toContain("Cost");
    expect(markup).toContain("Time");
    expect(markup).toContain("Cache");
    expect(markup).toContain("Input");
    expect(markup).toContain("Output");
    expect(markup).toContain("Reasoning");
    expect(markup).not.toContain("$12.50");
    expect(markup).toContain("background-color:var(--chart-1)");
    expect(markup).toContain("opacity:0.72");
    expect(markup).toContain("opacity:0.44");
    expect(markup).toContain("opacity:0.28");
  });

  it("renders a cost chart when switched to cost view", () => {
    const markup = renderToStaticMarkup(
      <TokenTrendCard
        defaultMetricView="cost"
        data={[
          {
            label: "2026-03-24",
            start: "2026-03-24T00:00:00.000Z",
            totalTokens: 150,
            inputTokens: 70,
            outputTokens: 50,
            reasoningTokens: 20,
            cachedTokens: 10,
            estimatedCostUsd: 1.25,
            totalSeconds: 1800,
          },
        ]}
      />,
    );

    expect(markup).toContain("Est. Cost");
    expect(markup).toContain("background-color:var(--chart-2)");
    expect(markup).not.toContain("No priced usage in this range.");
  });

  it("renders a total-time chart when switched to time view", () => {
    const markup = renderToStaticMarkup(
      <TokenTrendCard
        defaultMetricView="totalTime"
        data={[
          {
            label: "2026-03-24",
            start: "2026-03-24T00:00:00.000Z",
            totalTokens: 150,
            inputTokens: 70,
            outputTokens: 50,
            reasoningTokens: 20,
            cachedTokens: 10,
            estimatedCostUsd: 1.25,
            totalSeconds: 3660,
          },
        ]}
      />,
    );

    expect(markup).toContain("Time");
    expect(markup).toContain("background-color:var(--chart-3)");
  });

  it("shows an empty state for cost view when there is no priced data", () => {
    const markup = renderToStaticMarkup(
      <TokenTrendCard
        defaultMetricView="cost"
        data={[
          {
            label: "2026-03-24",
            start: "2026-03-24T00:00:00.000Z",
            totalTokens: 150,
            inputTokens: 70,
            outputTokens: 50,
            reasoningTokens: 20,
            cachedTokens: 10,
            estimatedCostUsd: 0,
            totalSeconds: 1800,
          },
        ]}
      />,
    );

    expect(markup).toContain("No priced usage in this range.");
  });

  it("renders plain-text tooltip rows for total, cache, input, output, reasoning, cost, and time", () => {
    const markup = renderToStaticMarkup(
      <TokenTrendTooltipContent
        active
        label="2026-03-24"
        locale="en"
        view="tokens"
        payload={[
          {
            payload: {
              label: "2026-03-24",
              start: "2026-03-24T00:00:00.000Z",
              totalTokens: 1500000,
              inputTokens: 700000,
              outputTokens: 500000,
              cachedTokens: 300000,
              reasoningTokens: 0,
              estimatedCostUsd: 1.25,
              totalSeconds: 3600,
            },
          },
        ]}
      />,
    );

    expect(markup).toContain("Total");
    expect(markup).toContain("Cache");
    expect(markup).toContain("Input");
    expect(markup).toContain("Output");
    expect(markup).toContain("Reasoning");
    expect(markup).toContain("Est. Cost");
    expect(markup).toContain("Total Time");
    expect(markup).toContain("1.5M");
    expect(markup).toContain("300K");
    expect(markup).toContain("700K");
    expect(markup).toContain("500K");
    expect(markup).toContain("0");
    expect(markup).toContain("$1.25");
    expect(markup).toContain("1h");
    expect(markup).toContain("background-color:var(--foreground)");
    expect(markup).toContain("background-color:var(--chart-1)");
    expect(markup).toContain("background-color:var(--chart-2)");
    expect(markup).toContain("opacity:0.72");
    expect(markup).toContain("opacity:0.44");
    expect(markup).toContain("opacity:0.28");
  });

  it("renders plain-text tooltip rows for time view", () => {
    const markup = renderToStaticMarkup(
      <TokenTrendTooltipContent
        active
        label="2026-03-24"
        locale="en"
        view="totalTime"
        payload={[
          {
            payload: {
              label: "2026-03-24",
              start: "2026-03-24T00:00:00.000Z",
              totalTokens: 150,
              inputTokens: 70,
              outputTokens: 50,
              cachedTokens: 10,
              reasoningTokens: 20,
              estimatedCostUsd: 1.25,
              totalSeconds: 3660,
            },
          },
        ]}
      />,
    );

    expect(markup).toContain("Total Time");
    expect(markup).toContain("1h 1m");
    expect(markup).toContain("Total");
    expect(markup).toContain("150");
    expect(markup).toContain("Est. Cost");
    expect(markup).toContain("$1.25");
    expect(markup).toContain("background-color:var(--chart-3)");
  });
});
