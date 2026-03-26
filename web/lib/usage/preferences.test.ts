import { describe, expect, it, vi } from "vitest";

import { ensureUsagePreferenceWithDb } from "./preferences";

describe("ensureUsagePreferenceWithDb", () => {
  it("returns the existing preference when a concurrent create hits the unique userId constraint", async () => {
    const existingPreference = {
      id: "pref_123",
      userId: "user_123",
      timezone: "UTC",
      projectMode: "hashed",
      projectHashSalt: "salt123",
      createdAt: new Date("2026-03-26T00:00:00.000Z"),
      updatedAt: new Date("2026-03-26T00:00:00.000Z"),
    };

    const db = {
      usagePreference: {
        findUnique: vi.fn().mockResolvedValueOnce(null),
        create: vi.fn().mockRejectedValueOnce({ code: "P2002" }),
        findUniqueOrThrow: vi.fn().mockResolvedValueOnce(existingPreference),
      },
    };

    const result = await ensureUsagePreferenceWithDb(db as never, "user_123");

    expect(result).toEqual(existingPreference);
    expect(db.usagePreference.findUnique).toHaveBeenCalledWith({
      where: { userId: "user_123" },
    });
    expect(db.usagePreference.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { userId: "user_123" },
    });
  });
});
