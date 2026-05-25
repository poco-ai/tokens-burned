import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../parsers/registry", () => ({
  getAllParsers: vi.fn(() => [
    {
      tool: { id: "test-tool", name: "Test Tool", dataDir: "/tmp/test" },
      parse: vi.fn().mockResolvedValue({ buckets: [], sessions: [] }),
    },
    {
      tool: {
        id: "tool-with-data",
        name: "Tool With Data",
        dataDir: "/tmp/test2",
      },
      parse: vi.fn().mockResolvedValue({
        buckets: [
          {
            source: "test",
            model: "gpt-4",
            project: "p",
            bucketStart: "2026-01-01",
            inputTokens: 100,
            outputTokens: 50,
            reasoningTokens: 0,
            cachedTokens: 0,
            totalTokens: 150,
          },
        ],
        sessions: [
          {
            source: "test",
            project: "p",
            sessionHash: "h1",
            firstMessageAt: "2026-01-01T00:00:00Z",
            lastMessageAt: "2026-01-01T01:00:00Z",
            durationSeconds: 3600,
            activeSeconds: 1800,
            messageCount: 2,
            userMessageCount: 1,
            inputTokens: 100,
            outputTokens: 50,
            reasoningTokens: 0,
            cachedTokens: 0,
            totalTokens: 150,
            primaryModel: "gpt-4",
            modelUsages: [],
          },
        ],
      }),
    },
    {
      tool: { id: "failing-tool", name: "Failing Tool", dataDir: "/tmp/test3" },
      parse: vi.fn().mockRejectedValue(new Error("parse error")),
    },
  ]),
  detectInstalledTools: vi.fn(() => []),
}));

vi.mock("../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { getAllParsers } from "../parsers/registry";
import { getDetectedTools, runAllParsers } from "./parser-service";

describe("parser-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runAllParsers", () => {
    it("collects results from all parsers", async () => {
      const result = await runAllParsers();
      expect(result.buckets).toHaveLength(1);
      expect(result.sessions).toHaveLength(1);
      expect(result.parserResults).toHaveLength(1);
      expect(result.parserResults[0].source).toBe("tool-with-data");
    });

    it("handles parser failures gracefully", async () => {
      const result = await runAllParsers();
      // failing-tool should be skipped, others should work
      expect(getAllParsers()).toHaveLength(3);
      expect(result.parserResults).toHaveLength(1);
    });
  });

  describe("getDetectedTools", () => {
    it("delegates to detectInstalledTools", () => {
      const tools = getDetectedTools();
      expect(tools).toEqual([]);
    });
  });
});
