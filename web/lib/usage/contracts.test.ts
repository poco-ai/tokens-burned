import { describe, expect, it } from "vitest";

import {
  dashboardQuerySchema,
  ingestRequestSchema,
  isValidTimezone,
  usageDeleteQuerySchema,
  usageKeyCreateSchema,
  usageKeyUpdateSchema,
  usagePreferenceUpdateSchema,
  usageSettingsSchema,
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

  it("requires a device id when deleting a device snapshot", () => {
    expect(
      usageDeleteQuerySchema.safeParse({
        deviceId: "device-1234",
      }).success,
    ).toBe(true);
    expect(
      usageDeleteQuerySchema.safeParse({
        deviceId: "",
      }).success,
    ).toBe(false);
  });
});

describe("isValidTimezone", () => {
  it("returns true for UTC", () => {
    expect(isValidTimezone("UTC")).toBe(true);
  });

  it("returns true for Asia/Shanghai", () => {
    expect(isValidTimezone("Asia/Shanghai")).toBe(true);
  });

  it("returns false for an invalid timezone string", () => {
    expect(isValidTimezone("Invalid/Timezone")).toBe(false);
  });
});

describe("usageKeyCreateSchema", () => {
  it("accepts a valid name", () => {
    const result = usageKeyCreateSchema.safeParse({ name: "My API Key" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = usageKeyCreateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a name exceeding 80 characters", () => {
    const result = usageKeyCreateSchema.safeParse({
      name: "a".repeat(81),
    });
    expect(result.success).toBe(false);
  });
});

describe("usageKeyUpdateSchema", () => {
  it("accepts update with only name", () => {
    const result = usageKeyUpdateSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts update with only status", () => {
    const result = usageKeyUpdateSchema.safeParse({ status: "disabled" });
    expect(result.success).toBe(true);
  });

  it("rejects update with neither name nor status", () => {
    const result = usageKeyUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("dashboardQuerySchema additional cases", () => {
  it("accepts a preset without from/to", () => {
    const result = dashboardQuerySchema.safeParse({ preset: "7d" });
    expect(result.success).toBe(true);
  });

  it("rejects custom preset without from and to", () => {
    const result = dashboardQuerySchema.safeParse({ preset: "custom" });
    expect(result.success).toBe(false);
  });

  it("accepts custom preset with valid from and to", () => {
    const result = dashboardQuerySchema.safeParse({
      preset: "custom",
      from: "2026-01-01",
      to: "2026-01-31",
    });
    expect(result.success).toBe(true);
  });
});

describe("usageSettingsSchema", () => {
  it("accepts a valid settings object", () => {
    const result = usageSettingsSchema.safeParse({
      schemaVersion: 2,
      projectMode: "raw",
      projectHashSalt: "some-salt-value",
      timezone: "UTC",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid schemaVersion", () => {
    const result = usageSettingsSchema.safeParse({
      schemaVersion: 99,
      projectMode: "raw",
      projectHashSalt: "some-salt-value",
      timezone: "UTC",
    });
    expect(result.success).toBe(false);
  });
});
