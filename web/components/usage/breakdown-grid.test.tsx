import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { UsageBreakdowns } from "@/lib/usage/types";
import { BreakdownGrid } from "./breakdown-grid";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    (namespace: string) =>
    (key: string): string => {
      if (namespace === "usage.breakdowns") {
        return (
          {
            title: "Breakdowns",
            description:
              "Break down usage by device, tool, model, and project.",
            "views.tokens": "Total Tokens",
            "views.cost": "Est. Cost",
            "summary.tokens": "Tokens",
            "summary.cost": "Cost",
            "summary.totalTime": "Time",
            "tabs.devices": "Devices",
            "tabs.tools": "Tools",
            "tabs.models": "Models",
            "tabs.projects": "Projects",
            "rankedBy.totalTokens": "Ranked by total tokens",
            "rankedBy.sessions": "Ranked by sessions",
            "rankedBy.messages": "Ranked by messages",
            "empty.devices": "No device data in this range.",
            "empty.tools": "No tool data in this range.",
            "empty.models": "No model data in this range.",
            "empty.projects": "No project data in this range.",
            emptyCost: "No priced usage in this range.",
            others: "Others",
          }[key] ?? key
        );
      }

      if (namespace === "usage.breakdowns.table") {
        return (
          {
            totalTokens: "Total Tokens",
            estimatedCost: "Est. Cost",
            totalTime: "Total Time",
            sessions: "Sessions",
            messages: "Messages",
            share: "Share",
          }[key] ?? key
        );
      }

      return key;
    },
}));

describe("BreakdownGrid", () => {
  const breakdowns: UsageBreakdowns = {
    devices: [],
    tools: [
      {
        key: "claude-code",
        name: "Claude Code",
        totalTokens: 50,
        inputTokens: 20,
        outputTokens: 20,
        reasoningTokens: 5,
        cachedTokens: 5,
        estimatedCostUsd: 10.5,
        activeSeconds: 0,
        totalSeconds: 1800,
        sessions: 3,
        messages: 15,
        userMessages: 8,
        share: 50 / 155,
      },
      {
        key: "cursor",
        name: "Cursor",
        totalTokens: 40,
        inputTokens: 18,
        outputTokens: 17,
        reasoningTokens: 3,
        cachedTokens: 2,
        estimatedCostUsd: 8.25,
        activeSeconds: 0,
        totalSeconds: 1200,
        sessions: 2,
        messages: 11,
        userMessages: 6,
        share: 40 / 155,
      },
      {
        key: "openai",
        name: "OpenAI",
        totalTokens: 30,
        inputTokens: 15,
        outputTokens: 10,
        reasoningTokens: 3,
        cachedTokens: 2,
        estimatedCostUsd: 6.75,
        activeSeconds: 0,
        totalSeconds: 900,
        sessions: 2,
        messages: 8,
        userMessages: 4,
        share: 30 / 155,
      },
      {
        key: "warp",
        name: "Warp",
        totalTokens: 20,
        inputTokens: 9,
        outputTokens: 8,
        reasoningTokens: 2,
        cachedTokens: 1,
        estimatedCostUsd: 5.1,
        activeSeconds: 0,
        totalSeconds: 600,
        sessions: 1,
        messages: 6,
        userMessages: 3,
        share: 20 / 155,
      },
      {
        key: "zed",
        name: "Zed",
        totalTokens: 10,
        inputTokens: 5,
        outputTokens: 4,
        reasoningTokens: 1,
        cachedTokens: 0,
        estimatedCostUsd: 2.6,
        activeSeconds: 0,
        totalSeconds: 300,
        sessions: 1,
        messages: 3,
        userMessages: 2,
        share: 10 / 155,
      },
      {
        key: "copilot",
        name: "Copilot",
        totalTokens: 5,
        inputTokens: 2,
        outputTokens: 2,
        reasoningTokens: 1,
        cachedTokens: 0,
        estimatedCostUsd: 1.1,
        activeSeconds: 0,
        totalSeconds: 120,
        sessions: 1,
        messages: 2,
        userMessages: 1,
        share: 5 / 155,
      },
    ],
    models: [
      {
        key: "gpt-5",
        name: "gpt-5",
        totalTokens: 80,
        inputTokens: 40,
        outputTokens: 30,
        reasoningTokens: 5,
        cachedTokens: 5,
        estimatedCostUsd: 12.5,
        activeSeconds: 0,
        totalSeconds: 0,
        sessions: 0,
        messages: 0,
        userMessages: 0,
        share: 0.8,
      },
      {
        key: "gpt-4.1",
        name: "gpt-4.1",
        totalTokens: 20,
        inputTokens: 10,
        outputTokens: 8,
        reasoningTokens: 1,
        cachedTokens: 1,
        estimatedCostUsd: 3.75,
        activeSeconds: 0,
        totalSeconds: 0,
        sessions: 0,
        messages: 0,
        userMessages: 0,
        share: 0.2,
      },
    ],
    projects: [
      {
        key: "proj_1",
        name: "tokenarena",
        totalTokens: 120,
        inputTokens: 55,
        outputTokens: 50,
        reasoningTokens: 10,
        cachedTokens: 5,
        estimatedCostUsd: 16.25,
        activeSeconds: 0,
        totalSeconds: 3600,
        sessions: 4,
        messages: 18,
        userMessages: 10,
        share: 1,
      },
    ],
  };

  it("can be collapsed with defaultOpen={false}", () => {
    const markup = renderToStaticMarkup(
      <BreakdownGrid breakdowns={breakdowns} defaultOpen={false} />,
    );

    expect(markup).toContain("Breakdowns");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain("Devices");
    expect(markup).not.toContain("md:grid-cols-2");
  });

  it("renders a 2x2 chart layout with per-card controls", () => {
    const markup = renderToStaticMarkup(
      <BreakdownGrid breakdowns={breakdowns} />,
    );

    expect(markup).toContain("Breakdowns");
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("md:grid-cols-2");
    expect(markup.match(/>Total Tokens<\/button>/g) ?? []).toHaveLength(4);
    expect(markup.match(/>Est\. Cost<\/button>/g) ?? []).toHaveLength(4);
    expect(markup).toContain("Devices");
    expect(markup).toContain("Tools");
    expect(markup).toContain("Models");
    expect(markup).toContain("Projects");
    expect(markup).toContain("No device data in this range.");
    expect(markup).not.toContain("$34.30");
    expect(markup).not.toContain("1h 22m");
    expect(markup).not.toContain("<table");
  });

  it("can switch the charts to estimated cost mode", () => {
    const markup = renderToStaticMarkup(
      <BreakdownGrid
        breakdowns={breakdowns}
        defaultOpen
        defaultMetricView="cost"
      />,
    );

    expect(
      markup.match(/data-variant="ghost"[^>]*>Total Tokens<\/button>/g) ?? [],
    ).toHaveLength(4);
    expect(
      markup.match(/data-variant="secondary"[^>]*>Est\. Cost<\/button>/g) ?? [],
    ).toHaveLength(4);
    expect(markup).not.toContain("No priced usage in this range.");
  });
});
