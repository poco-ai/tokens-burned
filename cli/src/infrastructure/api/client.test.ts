import { describe, expect, it } from "vitest";
import { getIngestPayloadSize } from "./client";

describe("ApiClient helpers", () => {
  describe("getIngestPayloadSize", () => {
    it("computes payload size in bytes", () => {
      const device = { deviceId: "dev1", hostname: "test" };
      const buckets = [
        {
          source: "test",
          model: "gpt-4",
          projectKey: "proj1",
          projectLabel: "Project 1",
          bucketStart: "2026-01-01T00:00:00Z",
          deviceId: "dev1",
          hostname: "test",
          inputTokens: 100,
          outputTokens: 50,
          reasoningTokens: 0,
          cachedTokens: 0,
          totalTokens: 150,
        },
      ];

      const size = getIngestPayloadSize(device, buckets);
      expect(size).toBeGreaterThan(0);

      const payload = { schemaVersion: 2, device, buckets, sessions: [] };
      expect(size).toBe(Buffer.byteLength(JSON.stringify(payload)));
    });

    it("includes sessions when provided", () => {
      const device = { deviceId: "dev1", hostname: "test" };
      const sessions = [
        {
          source: "test",
          projectKey: "proj1",
          projectLabel: "Project 1",
          sessionHash: "hash1",
          deviceId: "dev1",
          hostname: "test",
          firstMessageAt: "2026-01-01T00:00:00Z",
          lastMessageAt: "2026-01-01T01:00:00Z",
          durationSeconds: 3600,
          activeSeconds: 1800,
          messageCount: 10,
          userMessageCount: 5,
          inputTokens: 100,
          outputTokens: 50,
          reasoningTokens: 0,
          cachedTokens: 0,
          totalTokens: 150,
          primaryModel: "gpt-4",
          modelUsages: [],
        },
      ];

      const withSessions = getIngestPayloadSize(device, [], sessions);
      const withoutSessions = getIngestPayloadSize(device, []);
      expect(withSessions).toBeGreaterThan(withoutSessions);
    });
  });
});
