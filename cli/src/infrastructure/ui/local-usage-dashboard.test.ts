import { describe, expect, it } from "vitest";
import type { LocalUsageDashboardData } from "../../domain/local-usage-summary";
import { renderLocalUsageDashboard } from "./local-usage-dashboard";

const dashboard: LocalUsageDashboardData = {
  generatedAt: "2026-05-10T08:00:00.000Z",
  totals: {
    inputTokens: 100,
    outputTokens: 50,
    cachedTokens: 20,
    reasoningTokens: 10,
    totalTokens: 180,
    buckets: 1,
    sessions: 1,
    projects: 1,
    models: 1,
  },
  tools: [
    {
      source: "codex",
      name: "Codex CLI",
      totals: {
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 20,
        reasoningTokens: 10,
        totalTokens: 180,
        buckets: 1,
        sessions: 1,
        projects: 1,
        models: 1,
      },
      topModels: [
        {
          name: "gpt-5.4",
          inputTokens: 100,
          outputTokens: 50,
          cachedTokens: 20,
          reasoningTokens: 10,
          totalTokens: 180,
          sessions: 1,
        },
      ],
      topProjects: [
        {
          name: "tokens-burned",
          inputTokens: 100,
          outputTokens: 50,
          cachedTokens: 20,
          reasoningTokens: 10,
          totalTokens: 180,
          sessions: 1,
        },
      ],
      sessions: [
        {
          project: "tokens-burned",
          primaryModel: "gpt-5.4",
          lastMessageAt: "2026-05-10T08:30:00.000Z",
          totalTokens: 180,
          messageCount: 4,
          activeSeconds: 120,
        },
      ],
    },
  ],
};

describe("renderLocalUsageDashboard", () => {
  it("renders a static local usage snapshot", () => {
    const output = renderLocalUsageDashboard(dashboard, 0, { width: 120 });

    expect(output).toContain("TokenArena Local Usage");
    expect(output).toContain("Codex CLI");
    expect(output).toContain("Top Models");
    expect(output).toContain("gpt-5.4");
    expect(output).toContain("Recent Sessions");
  });

  it("uses compact token numbers in overview", () => {
    const output = renderLocalUsageDashboard(
      {
        ...dashboard,
        totals: {
          ...dashboard.totals,
          inputTokens: 1_234_000,
          outputTokens: 56_700,
          totalTokens: 1_290_700,
        },
        tools: [
          {
            ...dashboard.tools[0],
            totals: {
              ...dashboard.tools[0].totals,
              inputTokens: 1_234_000,
              outputTokens: 56_700,
              totalTokens: 1_290_700,
            },
          },
        ],
      },
      0,
      { width: 120 },
    );

    expect(output).toContain("1.3M total");
    expect(output).toContain("1.2M input");
    expect(output).toContain("56.7K output");
    expect(output).not.toContain("1,290,700 total");
  });

  it("renders an empty state when no usage exists", () => {
    const output = renderLocalUsageDashboard(
      {
        generatedAt: "2026-05-10T08:00:00.000Z",
        totals: {
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          reasoningTokens: 0,
          totalTokens: 0,
          buckets: 0,
          sessions: 0,
          projects: 0,
          models: 0,
        },
        tools: [],
      },
      0,
      { width: 120 },
    );

    expect(output).toContain("No local usage records were found");
  });

  it("keeps the selected tab at the left edge while indicating overflow", () => {
    const output = renderLocalUsageDashboard(
      {
        ...dashboard,
        tools: [
          dashboard.tools[0],
          { ...dashboard.tools[0], source: "qwen-code", name: "Qwen Code" },
          { ...dashboard.tools[0], source: "hermes", name: "Hermes Agent" },
          { ...dashboard.tools[0], source: "cursor", name: "Cursor" },
        ],
      },
      1,
      { width: 52 },
    );
    const tabLine = output.split("\n")[3];

    expect(tabLine).toContain("‹");
    expect(tabLine).toContain("▌  Qwen Code ");
    expect(tabLine).not.toContain("Codex CLI");
  });

  it("shows every tab without scrolling when they fit on one line", () => {
    const output = renderLocalUsageDashboard(
      {
        ...dashboard,
        tools: [
          dashboard.tools[0],
          { ...dashboard.tools[0], source: "qwen-code", name: "Qwen Code" },
          { ...dashboard.tools[0], source: "opencode", name: "OpenCode" },
        ],
      },
      1,
      { width: 120 },
    );
    const tabLine = output.split("\n")[3];

    expect(tabLine).not.toContain("‹");
    expect(tabLine).not.toContain("›");
    expect(tabLine).toContain("Codex CLI");
    expect(tabLine).toContain("Qwen Code");
    expect(tabLine).toContain("OpenCode");
  });

  it("renders with interactive hints", () => {
    const output = renderLocalUsageDashboard(dashboard, 0, {
      width: 120,
      interactive: true,
    });
    expect(output).toContain("Tab");
    expect(output).toContain("quit");
  });

  it("renders rank tables with no items", () => {
    const output = renderLocalUsageDashboard(
      {
        ...dashboard,
        tools: [
          {
            ...dashboard.tools[0],
            topModels: [],
            topProjects: [],
            sessions: [],
          },
        ],
      },
      0,
      { width: 120 },
    );
    expect(output).toContain("No usage found");
    expect(output).toContain("No sessions found");
  });

  it("handles billions in compact numbers", () => {
    const output = renderLocalUsageDashboard(
      {
        ...dashboard,
        totals: {
          ...dashboard.totals,
          inputTokens: 1_500_000_000,
          totalTokens: 1_500_000_000,
        },
        tools: [
          {
            ...dashboard.tools[0],
            totals: {
              ...dashboard.tools[0].totals,
              inputTokens: 1_500_000_000,
              totalTokens: 1_500_000_000,
            },
          },
        ],
      },
      0,
      { width: 120 },
    );
    expect(output).toContain("1.5B");
  });

  it("handles long session durations", () => {
    const output = renderLocalUsageDashboard(
      {
        ...dashboard,
        tools: [
          {
            ...dashboard.tools[0],
            sessions: [
              {
                ...dashboard.tools[0].sessions[0],
                activeSeconds: 7200,
              },
            ],
          },
        ],
      },
      0,
      { width: 120 },
    );
    expect(output).toContain("2h");
  });
});
