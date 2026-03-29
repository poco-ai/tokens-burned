import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { UsageSessionRow } from "@/lib/usage/types";
import { SessionsSection } from "./sessions-section";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    (namespace: string) =>
    (key: string, values?: Record<string, number | string>): string => {
      if (namespace !== "usage.sessions") {
        return key;
      }

      return (
        {
          title: "Sessions",
          description: "Browse usage one session at a time, newest first.",
          count: `${values?.count ?? 0} sessions`,
          empty: "No session data in this range.",
          "table.startedAt": "Started",
          "table.tool": "Tool",
          "table.model": "Model",
          "table.project": "Project",
          "table.device": "Device",
          "table.tokens": "Tokens",
          "table.cost": "Est. Cost",
          "table.input": "Input",
          "table.output": "Output",
          "table.reasoning": "Reasoning",
          "table.cache": "Cache",
          "pagination.prev": "Previous",
          "pagination.next": "Next",
          "pagination.info":
            `${values?.from ?? ""}–${values?.to ?? ""} of ${values?.total ?? ""}`.trim(),
        }[key] ?? key
      );
    },
}));

describe("SessionsSection", () => {
  const sessions: UsageSessionRow[] = [
    {
      id: "session_1",
      sessionHash: "abc123",
      source: "Claude Code",
      projectKey: "proj_1",
      projectLabel: "tokens-burned",
      deviceId: "device_1",
      deviceLabel: "mac-mini",
      firstMessageAt: "2026-03-27T00:15:00.000Z",
      lastMessageAt: "2026-03-27T01:15:00.000Z",
      durationSeconds: 3600,
      activeSeconds: 2700,
      messageCount: 12,
      userMessageCount: 5,
      estimatedCostUsd: 0.12,
      totalTokens: 15000,
      inputTokens: 8000,
      outputTokens: 5000,
      reasoningTokens: 1500,
      cachedTokens: 500,
      primaryModel: "claude-sonnet-4-20250514",
    },
  ];

  it("can be collapsed with defaultOpen={false}", () => {
    const markup = renderToStaticMarkup(
      <TooltipProvider>
        <SessionsSection
          sessions={sessions}
          timezone="Asia/Shanghai"
          defaultOpen={false}
        />
      </TooltipProvider>,
    );

    expect(markup).toContain("Sessions");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain("Claude Code");
    expect(markup).not.toContain("<table");
  });

  it("renders the session table by default", () => {
    const markup = renderToStaticMarkup(
      <TooltipProvider>
        <SessionsSection sessions={sessions} timezone="Asia/Shanghai" />
      </TooltipProvider>,
    );

    expect(markup).toContain("Sessions");
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("Started");
    expect(markup).toContain("Claude Code");
    expect(markup).toContain("claude-sonnet-4-20250514");
    expect(markup).toContain("tokens-burned");
    expect(markup).toContain("mac-mini");
    expect(markup).toContain("15K");
    expect(markup).toContain("Tokens");
    expect(markup).toContain("Model");
    expect(markup).toContain("<table");
  });
});
