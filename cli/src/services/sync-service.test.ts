import { describe, expect, it } from "vitest";
import {
  formatBytes,
  renderProgressBar,
  toUploadBuckets,
  toUploadSessions,
} from "./sync-service";

describe("sync-service helpers", () => {
  describe("formatBytes", () => {
    it("formats bytes", () => {
      expect(formatBytes(0)).toBe("0B");
      expect(formatBytes(512)).toBe("512B");
    });

    it("formats kilobytes", () => {
      expect(formatBytes(1024)).toBe("1.0KB");
      expect(formatBytes(1536)).toBe("1.5KB");
    });

    it("formats megabytes", () => {
      expect(formatBytes(1024 * 1024)).toBe("1.0MB");
      expect(formatBytes(5 * 1024 * 1024)).toBe("5.0MB");
    });
  });

  describe("renderProgressBar", () => {
    it("renders empty bar", () => {
      const bar = renderProgressBar(0);
      expect(bar).toContain("░");
      expect(bar).not.toContain("█");
    });

    it("renders full bar", () => {
      const bar = renderProgressBar(1);
      expect(bar).toContain("█");
      expect(bar).not.toContain("░");
    });

    it("clamps negative progress", () => {
      const bar = renderProgressBar(-1);
      expect(bar).toContain("░");
      expect(bar).not.toContain("█");
    });

    it("clamps progress > 1", () => {
      const bar = renderProgressBar(2);
      expect(bar).toContain("█");
      expect(bar).not.toContain("░");
    });
  });

  describe("toUploadBuckets", () => {
    const settings = {
      schemaVersion: 2 as const,
      projectHashSalt: "salt",
      projectMode: "hashed" as const,
      timezone: "UTC",
    };
    const device = { deviceId: "dev1", hostname: "test" };

    it("converts empty buckets", () => {
      expect(toUploadBuckets([], settings, device)).toEqual([]);
    });

    it("converts single bucket", () => {
      const buckets = [
        {
          source: "test",
          model: "gpt-4",
          project: "my-project",
          bucketStart: "2026-01-01T00:00:00Z",
          inputTokens: 100,
          outputTokens: 50,
          reasoningTokens: 10,
          cachedTokens: 20,
          totalTokens: 160,
        },
      ];
      const result = toUploadBuckets(buckets, settings, device);
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe("test");
      expect(result[0].inputTokens).toBe(100);
      expect(result[0].deviceId).toBe("dev1");
    });

    it("aggregates buckets with same key", () => {
      const buckets = [
        {
          source: "test",
          model: "gpt-4",
          project: "proj",
          bucketStart: "2026-01-01T00:00:00Z",
          inputTokens: 100,
          outputTokens: 50,
          reasoningTokens: 0,
          cachedTokens: 0,
          totalTokens: 150,
        },
        {
          source: "test",
          model: "gpt-4",
          project: "proj",
          bucketStart: "2026-01-01T00:00:00Z",
          inputTokens: 200,
          outputTokens: 100,
          reasoningTokens: 0,
          cachedTokens: 0,
          totalTokens: 300,
        },
      ];
      const result = toUploadBuckets(buckets, settings, device);
      expect(result).toHaveLength(1);
      expect(result[0].inputTokens).toBe(300);
      expect(result[0].outputTokens).toBe(150);
    });

    it("defaults reasoningTokens and cachedTokens to 0 when undefined", () => {
      const buckets = [
        {
          source: "test",
          model: "gpt-4",
          project: "proj",
          bucketStart: "2026-01-01T00:00:00Z",
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        },
      ];
      const result = toUploadBuckets(buckets, settings, device);
      expect(result[0].reasoningTokens).toBe(0);
      expect(result[0].cachedTokens).toBe(0);
    });
  });

  describe("toUploadSessions", () => {
    const settings = {
      schemaVersion: 2 as const,
      projectHashSalt: "salt",
      projectMode: "hashed" as const,
      timezone: "UTC",
    };
    const device = { deviceId: "dev1", hostname: "test" };

    it("converts empty sessions", () => {
      expect(toUploadSessions([], settings, device)).toEqual([]);
    });

    it("converts sessions with all fields", () => {
      const sessions = [
        {
          source: "test",
          project: "my-project",
          sessionHash: "hash1",
          firstMessageAt: "2026-01-01T00:00:00Z",
          lastMessageAt: "2026-01-01T01:00:00Z",
          durationSeconds: 3600,
          activeSeconds: 1800,
          messageCount: 10,
          userMessageCount: 5,
          inputTokens: 100,
          outputTokens: 50,
          reasoningTokens: 20,
          cachedTokens: 10,
          totalTokens: 150,
          primaryModel: "gpt-4",
          modelUsages: [],
        },
      ];
      const result = toUploadSessions(sessions, settings, device);
      expect(result).toHaveLength(1);
      expect(result[0].sessionHash).toBe("hash1");
      expect(result[0].deviceId).toBe("dev1");
      expect(result[0].primaryModel).toBe("gpt-4");
    });
  });
});
