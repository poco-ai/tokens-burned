import { describe, expect, it } from "vitest";
import { buildLocalUsageDashboardData } from "./local-usage-summary";
import type { SessionMetadata, TokenBucket } from "./types";

function bucket(overrides: Partial<TokenBucket> = {}): TokenBucket {
  return {
    source: "codex",
    model: "gpt-5.4",
    project: "tokens-burned",
    bucketStart: "2026-05-10T08:00:00.000Z",
    hostname: "host",
    inputTokens: 100,
    outputTokens: 50,
    cachedTokens: 25,
    reasoningTokens: 10,
    totalTokens: 185,
    ...overrides,
  };
}

function session(overrides: Partial<SessionMetadata> = {}): SessionMetadata {
  return {
    source: "codex",
    project: "tokens-burned",
    sessionHash: "session-1",
    hostname: "host",
    firstMessageAt: "2026-05-10T08:00:00.000Z",
    lastMessageAt: "2026-05-10T08:30:00.000Z",
    durationSeconds: 1800,
    activeSeconds: 600,
    messageCount: 6,
    userMessageCount: 3,
    userPromptHours: [8],
    inputTokens: 100,
    outputTokens: 50,
    cachedTokens: 25,
    reasoningTokens: 10,
    totalTokens: 185,
    primaryModel: "gpt-5.4",
    modelUsages: [],
    ...overrides,
  };
}

describe("buildLocalUsageDashboardData", () => {
  it("groups local usage by tool and builds ranked summaries", () => {
    const data = buildLocalUsageDashboardData({
      tools: [
        { id: "codex", name: "Codex CLI" },
        { id: "qwen-code", name: "Qwen Code" },
        { id: "unused-tool", name: "Unused Tool" },
      ],
      buckets: [
        bucket(),
        bucket({
          model: "claude-sonnet-4.5",
          project: "other-project",
          totalTokens: 300,
          inputTokens: 200,
          outputTokens: 100,
          cachedTokens: 0,
          reasoningTokens: 0,
        }),
        bucket({
          source: "qwen-code",
          model: "qwen3-coder",
          project: "tokens-burned",
          totalTokens: 90,
          inputTokens: 70,
          outputTokens: 20,
          cachedTokens: 0,
          reasoningTokens: 0,
        }),
      ],
      sessions: [session(), session({ sessionHash: "session-2" })],
    });

    expect(data.totals.totalTokens).toBe(575);
    expect(data.totals.sessions).toBe(2);
    expect(data.tools.map((tool) => tool.source)).toEqual([
      "codex",
      "qwen-code",
    ]);

    const codex = data.tools[0];
    expect(codex.name).toBe("Codex CLI");
    expect(codex.totals.totalTokens).toBe(485);
    expect(codex.totals.sessions).toBe(2);
    expect(codex.topModels[0].name).toBe("claude-sonnet-4.5");
    expect(codex.topProjects[0].name).toBe("other-project");
  });

  it("does not include tools that have no parsed usage", () => {
    const data = buildLocalUsageDashboardData({
      tools: [{ id: "codex", name: "Codex CLI" }],
      buckets: [],
      sessions: [],
    });

    expect(data.totals.totalTokens).toBe(0);
    expect(data.tools).toHaveLength(0);
  });
});
