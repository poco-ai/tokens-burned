import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usagePreferenceFindUnique: vi.fn(),
  usagePreferenceCreate: vi.fn(),
  usagePreferenceFindUniqueOrThrow: vi.fn(),
  usagePreferenceUpdate: vi.fn(),
  invalidateLeaderboardSnapshots: vi.fn(),
  prismaTransaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    usagePreference: {
      findUnique: mocks.usagePreferenceFindUnique,
      create: mocks.usagePreferenceCreate,
      findUniqueOrThrow: mocks.usagePreferenceFindUniqueOrThrow,
      update: mocks.usagePreferenceUpdate,
    },
    $transaction: mocks.prismaTransaction,
  },
}));

vi.mock("@/lib/leaderboard/aggregates", () => ({
  invalidateLeaderboardSnapshots: mocks.invalidateLeaderboardSnapshots,
}));

import {
  ensureUsagePreferenceWithDb,
  updateUsagePreference,
} from "./preferences";

function createPreference(overrides: Record<string, unknown> = {}) {
  return {
    id: "pref_123",
    userId: "user_123",
    locale: "en",
    theme: "system",
    timezone: "UTC",
    projectMode: "hashed",
    projectHashSalt: "salt123",
    publicProfileEnabled: false,
    bio: null,
    createdAt: new Date("2026-03-26T00:00:00.000Z"),
    updatedAt: new Date("2026-03-26T00:00:00.000Z"),
    ...overrides,
  };
}

describe("ensureUsagePreferenceWithDb", () => {
  it("returns the existing preference when a concurrent create hits the unique userId constraint", async () => {
    const existingPreference = createPreference();

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

  it("returns the existing preference when it already exists", async () => {
    const existingPreference = createPreference();

    const db = {
      usagePreference: {
        findUnique: vi.fn().mockResolvedValueOnce(existingPreference),
        create: vi.fn(),
        findUniqueOrThrow: vi.fn(),
      },
    };

    const result = await ensureUsagePreferenceWithDb(db as never, "user_123");

    expect(result).toEqual(existingPreference);
    expect(db.usagePreference.create).not.toHaveBeenCalled();
    expect(db.usagePreference.findUnique).toHaveBeenCalledWith({
      where: { userId: "user_123" },
    });
  });

  it("creates a new preference when none exists", async () => {
    const newPreference = createPreference();

    const db = {
      usagePreference: {
        findUnique: vi.fn().mockResolvedValueOnce(null),
        create: vi.fn().mockResolvedValueOnce(newPreference),
        findUniqueOrThrow: vi.fn(),
      },
    };

    const result = await ensureUsagePreferenceWithDb(db as never, "user_123");

    expect(result).toEqual(newPreference);
    expect(db.usagePreference.create).toHaveBeenCalledWith({
      data: {
        userId: "user_123",
        projectHashSalt: expect.any(String),
      },
    });
  });

  it("throws non-P2002 errors from create", async () => {
    const error = new Error("connection lost");

    const db = {
      usagePreference: {
        findUnique: vi.fn().mockResolvedValueOnce(null),
        create: vi.fn().mockRejectedValueOnce(error),
        findUniqueOrThrow: vi.fn(),
      },
    };

    await expect(
      ensureUsagePreferenceWithDb(db as never, "user_123"),
    ).rejects.toThrow("connection lost");

    expect(db.usagePreference.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});

describe("updateUsagePreference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates preference fields and returns the updated record", async () => {
    const existing = createPreference({ publicProfileEnabled: false });
    const updated = createPreference({
      locale: "zh",
      publicProfileEnabled: false,
    });

    mocks.prismaTransaction.mockImplementation(
      async (fn: (tx: unknown) => unknown) => {
        const tx = {
          usagePreference: {
            findUnique: vi.fn().mockResolvedValueOnce(existing),
            create: vi.fn(),
            findUniqueOrThrow: vi.fn(),
            update: vi.fn().mockResolvedValueOnce(updated),
          },
        };
        return fn(tx);
      },
    );

    const result = await updateUsagePreference("user_123", { locale: "zh" });

    expect(result).toEqual(updated);
    expect(mocks.invalidateLeaderboardSnapshots).not.toHaveBeenCalled();
  });

  it("triggers invalidateLeaderboardSnapshots when publicProfileEnabled changes", async () => {
    const existing = createPreference({ publicProfileEnabled: false });
    const updated = createPreference({ publicProfileEnabled: true });

    mocks.prismaTransaction.mockImplementation(
      async (fn: (tx: unknown) => unknown) => {
        const tx = {
          usagePreference: {
            findUnique: vi.fn().mockResolvedValueOnce(existing),
            create: vi.fn(),
            findUniqueOrThrow: vi.fn(),
            update: vi.fn().mockResolvedValueOnce(updated),
          },
          leaderboardSnapshot: {
            deleteMany: vi.fn().mockResolvedValueOnce(undefined),
          },
        };
        return fn(tx);
      },
    );
    mocks.invalidateLeaderboardSnapshots.mockResolvedValueOnce(undefined);

    const result = await updateUsagePreference("user_123", {
      publicProfileEnabled: true,
    });

    expect(result).toEqual(updated);
    expect(mocks.invalidateLeaderboardSnapshots).toHaveBeenCalledTimes(1);
  });

  it("does not trigger invalidateLeaderboardSnapshots when publicProfileEnabled stays the same", async () => {
    const existing = createPreference({ publicProfileEnabled: true });
    const updated = createPreference({
      publicProfileEnabled: true,
      timezone: "Asia/Shanghai",
    });

    mocks.prismaTransaction.mockImplementation(
      async (fn: (tx: unknown) => unknown) => {
        const tx = {
          usagePreference: {
            findUnique: vi.fn().mockResolvedValueOnce(existing),
            create: vi.fn(),
            findUniqueOrThrow: vi.fn(),
            update: vi.fn().mockResolvedValueOnce(updated),
          },
        };
        return fn(tx);
      },
    );

    const result = await updateUsagePreference("user_123", {
      publicProfileEnabled: true,
    });

    expect(result).toEqual(updated);
    expect(mocks.invalidateLeaderboardSnapshots).not.toHaveBeenCalled();
  });
});
