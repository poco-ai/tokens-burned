import { describe, expect, it } from "vitest";

import { extractSessions } from "./session-extractor";

describe("extractSessions", () => {
  it("counts only user and assistant messages", () => {
    const [session] = extractSessions([
      {
        sessionId: "s1",
        source: "claude-code",
        project: "tokens-burned",
        timestamp: new Date("2026-03-26T10:00:00.000Z"),
        role: "user",
      },
      {
        sessionId: "s1",
        source: "claude-code",
        project: "tokens-burned",
        timestamp: new Date("2026-03-26T10:00:05.000Z"),
        role: "assistant",
      },
    ]);

    expect(session.messageCount).toBe(2);
    expect(session.userMessageCount).toBe(1);
  });
});
