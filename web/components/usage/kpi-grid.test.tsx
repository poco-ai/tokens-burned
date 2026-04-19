import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/count-up", () => ({
  default: function MockCountUp({
    to,
    format,
  }: {
    to: number;
    format: (n: number) => string;
  }) {
    return <span>{format(to)}</span>;
  },
}));

vi.mock("next-intl/server", () => ({
  getTranslations:
    async () => (key: string, values?: Record<string, string>) => {
      if (key === "deltaVsPrevious") {
        return `${values?.delta ?? ""} vs previous ${values?.previous ?? ""}`;
      }

      return (
        {
          estimatedCost: "Est. Cost",
          totalTokens: "Total Tokens",
          inputTokens: "Input Tokens",
          outputTokens: "Output Tokens",
          reasoningTokens: "Reasoning Tokens",
          reasoningIncluded: `${values?.value ?? ""} reasoning`,
          reasoningSuffix: " reasoning",
          cachedTokens: "Cached Tokens",
          activeTime: "Active Time",
          totalTime: "Total Time",
          "definitions.activeTime.open": "What is active time?",
          "definitions.activeTime.title": "Active Time",
          "definitions.activeTime.summary":
            "Counts only the time when AI is actively generating a reply.",
          "definitions.activeTime.details":
            "Queueing, TTFT, and idle gaps between prompts are excluded.",
          "definitions.totalTime.open": "What is total time?",
          "definitions.totalTime.title": "Total Time",
          "definitions.totalTime.summary":
            "Sums each session from the first message to the last message.",
          "definitions.totalTime.details":
            "Idle time inside a session is included, but gaps between sessions are not.",
          sessions: "Sessions",
          messages: "Messages",
          userMessages: "User Messages",
        }[key] ?? key
      );
    },
}));

vi.mock("./pricing-match-dialog", () => ({
  PricingMatchDialog: () => <div data-slot="pricing-match-dialog" />,
}));

import { KpiGrid } from "./kpi-grid";

describe("KpiGrid", () => {
  it("renders output as a combined completion total with smaller reasoning text", async () => {
    const markup = renderToStaticMarkup(
      await KpiGrid({
        overview: {
          totalTokens: {
            current: 330800000,
            previous: 132900000,
            delta: 197900000,
          },
          inputTokens: {
            current: 18700000,
            previous: 4300000,
            delta: 14500000,
          },
          outputTokens: { current: 1800000, previous: 2350600, delta: -550600 },
          reasoningTokens: { current: 825500, previous: 825500, delta: 0 },
          cachedTokens: {
            current: 310300000,
            previous: 127400000,
            delta: 182900000,
          },
          activeSeconds: { current: 41400, previous: 21000, delta: 20400 },
          totalSeconds: { current: 62160, previous: 37860, delta: 24300 },
          sessions: { current: 53, previous: 48, delta: 5 },
          messages: { current: 4600, previous: 3617, delta: 983 },
          userMessages: { current: 407, previous: 784, delta: -377 },
        },
        pricingSummary: {
          currentUsd: 123.456,
          previousUsd: 100.1,
          deltaUsd: 23.356,
          pricedTokens: 330800000,
          totalTokens: 330800000,
          coverage: 1,
          pricedModels: 4,
          totalModels: 4,
        },
      }),
    );

    const titleIndex = markup.indexOf("Est. Cost");
    const costDeltaIndex = markup.indexOf("+$23.36");
    const costCurrentIndex = markup.indexOf("$123.46");
    const tokenTitleIndex = markup.indexOf("Total Tokens");
    const outputTitleIndex = markup.indexOf("Output Tokens");
    const deltaIndex = markup.indexOf("+197.9M");
    const currentIndex = markup.indexOf("330.8M");

    expect(titleIndex).toBeGreaterThan(-1);
    expect(costDeltaIndex).toBeGreaterThan(titleIndex);
    expect(costCurrentIndex).toBeGreaterThan(costDeltaIndex);
    expect(tokenTitleIndex).toBeGreaterThan(costCurrentIndex);
    expect(outputTitleIndex).toBeGreaterThan(tokenTitleIndex);
    expect(deltaIndex).toBeGreaterThan(titleIndex);
    expect(currentIndex).toBeGreaterThan(deltaIndex);
    expect(markup).toContain("$123.46");
    expect(markup).toContain('title="+$23.36 vs previous $100.10"');
    expect(markup).toContain('data-slot="pricing-match-dialog"');
    expect(markup).toContain("330.8M");
    expect(markup).toContain(">+197.9M</span>");
    expect(markup).toContain("2.6M");
    expect(markup).toContain("825.5K");
    expect(markup).toContain(" reasoning");
    expect(markup).toContain('title="-550.6K vs previous 3.2M"');
    expect(markup).toContain(">+6h45m</span>");
    expect(markup).toContain('title="+197.9M vs previous 132.9M"');
    expect(markup).toContain('title="-377 vs previous 784"');
    expect(markup).toContain('aria-label="What is active time?"');
    expect(markup).toContain('aria-label="What is total time?"');
    expect(markup).toContain("flex items-center justify-between gap-2");
    expect(markup).toContain('data-delta-tone="positive"');
    expect(markup).toContain('data-delta-tone="negative"');
    expect(markup).not.toContain(">Reasoning Tokens</h3>");
    expect(markup).not.toContain("<sup");
  });
});
