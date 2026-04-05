import { describe, expect, it } from "vitest";

import {
  dashboardQuerySchema,
  ingestRequestSchema,
  usagePreferenceUpdateSchema,
} from "./contracts";

describe("ingestRequestSchema", () => {
  it("requires schemaVersion and device metadata", () => {
    const result = ingestRequestSchema.safeParse({
      buckets: [],
      sessions: [],
    });

    expect(result.success).toBe(false);
  });

  it("accepts date-only custom dashboard queries", () => {
    const result = dashboardQuerySchema.safeParse({
      preset: "custom",
      from: "2026-03-26",
      to: "2026-03-27",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid custom dashboard dates", () => {
    const result = dashboardQuerySchema.safeParse({
      preset: "custom",
      from: "not-a-date",
      to: "2026-03-27",
    });

    expect(result.success).toBe(false);
  });

  it("preserves reasoning tokens as a separate field", () => {
    const result = ingestRequestSchema.safeParse({
      schemaVersion: 2,
      device: {
        deviceId: "device-1234",
        hostname: "macbook-pro",
        deviceFingerprint:
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      },
      buckets: [
        {
          source: "codex",
          model: "gpt-5.4",
          projectKey: "abc123",
          projectLabel: "Project abc123",
          bucketStart: "2026-03-26T10:00:00.000Z",
          inputTokens: 100,
          outputTokens: 60,
          reasoningTokens: 10,
          cachedTokens: 25,
          totalTokens: 185,
        },
      ],
      sessions: [
        {
          source: "codex",
          projectKey: "abc123",
          projectLabel: "Project abc123",
          sessionHash: "session-hash",
          firstMessageAt: "2026-03-26T10:00:00.000Z",
          lastMessageAt: "2026-03-26T10:10:00.000Z",
          durationSeconds: 600,
          activeSeconds: 420,
          messageCount: 8,
          userMessageCount: 3,
          inputTokens: 100,
          outputTokens: 60,
          reasoningTokens: 10,
          cachedTokens: 25,
          totalTokens: 195,
          primaryModel: "gpt-5.4",
          modelUsages: [
            {
              model: "gpt-5.4",
              inputTokens: 100,
              outputTokens: 60,
              reasoningTokens: 10,
              cachedTokens: 25,
              totalTokens: 195,
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.buckets[0]?.reasoningTokens).toBe(10);
      expect(result.data.sessions[0]?.reasoningTokens).toBe(10);
      expect(result.data.sessions[0]?.primaryModel).toBe("gpt-5.4");
      expect(result.data.sessions[0]?.modelUsages?.[0]?.totalTokens).toBe(195);
    }
  });

  it("accepts locale and theme updates in usage preferences", () => {
    const result = usagePreferenceUpdateSchema.safeParse({
      locale: "zh",
      theme: "dark",
    });

    expect(result.success).toBe(true);
  });
});
