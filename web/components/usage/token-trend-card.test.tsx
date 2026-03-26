import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Area, Bar, Legend } from "recharts";
import { describe, expect, it } from "vitest";

import { TokenTrendCard, TokenTrendTooltipContent } from "./token-trend-card";

function collectElements(node: ReactNode): Array<{
  type: unknown;
  props: Record<string, unknown>;
}> {
  const elements: Array<{ type: unknown; props: Record<string, unknown> }> = [];

  function visit(value: ReactNode) {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }

      return;
    }

    if (
      value &&
      typeof value === "object" &&
      "type" in value &&
      "props" in value &&
      value.props &&
      typeof value.props === "object"
    ) {
      const element = value as {
        type: unknown;
        props: Record<string, unknown> & { children?: ReactNode };
      };

      elements.push({
        type: element.type,
        props: element.props,
      });
      visit(element.props.children);
    }
  }

  visit(node);

  return elements;
}

describe("TokenTrendCard", () => {
  it("renders stacked bars for cached, input, and output tokens only", () => {
    const tree = TokenTrendCard({
      data: [
        {
          label: "2026-03-24",
          start: "2026-03-24T00:00:00.000Z",
          totalTokens: 150,
          inputTokens: 70,
          outputTokens: 50,
          reasoningTokens: 20,
          cachedTokens: 10,
        },
      ],
    });

    const elements = collectElements(tree);
    const bars = elements.filter((element) => element.type === Bar);

    expect(bars.map((bar) => bar.props.dataKey)).toEqual([
      "cachedTokens",
      "inputTokens",
      "outputTokens",
    ]);
    expect(bars.map((bar) => bar.props.fill)).toEqual([
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-1)",
    ]);
    expect(bars.every((bar) => bar.props.stackId === "tokens")).toBeTruthy();
    expect(elements.some((element) => element.type === Area)).toBeFalsy();
    expect(elements.some((element) => element.type === Legend)).toBeFalsy();
  });

  it("does not render the redundant chart description copy", () => {
    const markup = renderToStaticMarkup(
      TokenTrendCard({
        data: [
          {
            label: "2026-03-24",
            start: "2026-03-24T00:00:00.000Z",
            totalTokens: 150,
            inputTokens: 70,
            outputTokens: 50,
            reasoningTokens: 20,
            cachedTokens: 10,
          },
        ],
      }),
    );

    expect(markup).toContain("Daily Trend");
    expect(markup).toContain("Cache");
    expect(markup).toContain("Input");
    expect(markup).toContain("Output");
    expect(markup).toContain("background-color:var(--chart-2)");
    expect(markup).toContain("background-color:var(--chart-3)");
    expect(markup).toContain("background-color:var(--chart-1)");
    expect(markup).not.toContain(
      "Stacked cached, input, and output tokens by day.",
    );
    expect(markup).not.toContain(
      "Hover for total, cache, input, and output values.",
    );
  });

  it("renders plain-text tooltip rows for total, cache, input, and output", () => {
    const markup = renderToStaticMarkup(
      <TokenTrendTooltipContent
        active
        label="2026-03-24"
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
            },
          },
        ]}
      />,
    );

    expect(markup).toContain("Total");
    expect(markup).toContain("Cache");
    expect(markup).toContain("Input");
    expect(markup).toContain("Output");
    expect(markup).toContain("1.5M");
    expect(markup).toContain("300.0K");
    expect(markup).toContain("700.0K");
    expect(markup).toContain("500.0K");
  });
});
