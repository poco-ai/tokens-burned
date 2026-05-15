import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usageApiKeyCreate: vi.fn(),
  usageApiKeyFindMany: vi.fn(),
  usageApiKeyFindFirst: vi.fn(),
  usageApiKeyFindUnique: vi.fn(),
  usageApiKeyUpdate: vi.fn(),
  usageApiKeyDelete: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    usageApiKey: {
      create: mocks.usageApiKeyCreate,
      findMany: mocks.usageApiKeyFindMany,
      findFirst: mocks.usageApiKeyFindFirst,
      findUnique: mocks.usageApiKeyFindUnique,
      update: mocks.usageApiKeyUpdate,
      delete: mocks.usageApiKeyDelete,
    },
  },
}));

import {
  createUsageApiKey,
  deleteUsageApiKey,
  findUsageApiKeyByRaw,
  generateUsageApiKey,
  hashUsageApiKey,
  listUsageApiKeys,
  splitApiKeyPrefix,
  updateUsageApiKey,
} from "./api-keys";

function createApiKey(overrides: Record<string, unknown> = {}) {
  return {
    id: "key_123",
    userId: "user_123",
    name: "Test Key",
    prefix: "ta_abc12345",
    keyHash: hashUsageApiKey("ta_testrawkeyvalue12345678901234"),
    status: "active" as const,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("usage api keys", () => {
  it("generates ta_ prefixed keys", () => {
    const key = generateUsageApiKey();

    expect(key.raw.startsWith("ta_")).toBe(true);
    expect(key.prefix).toBe(key.raw.slice(0, 11));
  });

  it("hashes deterministically", () => {
    expect(hashUsageApiKey("ta_test")).toBe(hashUsageApiKey("ta_test"));
  });

  it("extracts the display prefix", () => {
    expect(splitApiKeyPrefix("ta_1234567890abcdef")).toBe("ta_12345678");
  });
});

describe("findUsageApiKeyByRaw", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when key does not start with ta_", async () => {
    const result = await findUsageApiKeyByRaw("sk_invalidkey");

    expect(result).toBeNull();
    expect(mocks.usageApiKeyFindUnique).not.toHaveBeenCalled();
  });

  it("returns null when key is disabled", async () => {
    mocks.usageApiKeyFindUnique.mockResolvedValueOnce(
      createApiKey({ status: "disabled" }),
    );

    const result = await findUsageApiKeyByRaw(
      "ta_testrawkeyvalue12345678901234",
    );

    expect(result).toBeNull();
  });

  it("returns the API key on valid lookup", async () => {
    const apiKey = createApiKey();
    mocks.usageApiKeyFindUnique.mockResolvedValueOnce(apiKey);

    const result = await findUsageApiKeyByRaw(
      "ta_testrawkeyvalue12345678901234",
    );

    expect(result).toEqual(apiKey);
    expect(mocks.usageApiKeyFindUnique).toHaveBeenCalledWith({
      where: { keyHash: hashUsageApiKey("ta_testrawkeyvalue12345678901234") },
    });
  });
});

describe("createUsageApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a key with trimmed name and returns raw key and record", async () => {
    const savedKey = createApiKey({ name: "My Key" });
    mocks.usageApiKeyCreate.mockResolvedValueOnce(savedKey);

    const result = await createUsageApiKey("user_123", "  My Key  ");

    expect(mocks.usageApiKeyCreate).toHaveBeenCalledWith({
      data: {
        userId: "user_123",
        name: "My Key",
        prefix: expect.any(String),
        keyHash: expect.any(String),
      },
    });
    expect(result.rawKey.startsWith("ta_")).toBe(true);
    expect(result.apiKey).toEqual(savedKey);
  });
});

describe("listUsageApiKeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns keys for the user ordered by createdAt desc", async () => {
    const keys = [createApiKey({ id: "key_2" }), createApiKey({ id: "key_1" })];
    mocks.usageApiKeyFindMany.mockResolvedValueOnce(keys);

    const result = await listUsageApiKeys("user_123");

    expect(mocks.usageApiKeyFindMany).toHaveBeenCalledWith({
      where: { userId: "user_123" },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toEqual(keys);
  });
});

describe("updateUsageApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when key not found for user", async () => {
    mocks.usageApiKeyFindFirst.mockResolvedValueOnce(null);

    const result = await updateUsageApiKey("user_123", "key_999", {
      name: "New",
    });

    expect(result).toBeNull();
    expect(mocks.usageApiKeyUpdate).not.toHaveBeenCalled();
  });

  it("updates and returns the key when found", async () => {
    const existing = createApiKey();
    const updated = { ...existing, name: "Updated" };
    mocks.usageApiKeyFindFirst.mockResolvedValueOnce(existing);
    mocks.usageApiKeyUpdate.mockResolvedValueOnce(updated);

    const result = await updateUsageApiKey("user_123", "key_123", {
      name: "  Updated  ",
    });

    expect(mocks.usageApiKeyUpdate).toHaveBeenCalledWith({
      where: { id: "key_123" },
      data: { name: "Updated", status: undefined },
    });
    expect(result).toEqual(updated);
  });
});

describe("deleteUsageApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when key not found for user", async () => {
    mocks.usageApiKeyFindFirst.mockResolvedValueOnce(null);

    const result = await deleteUsageApiKey("user_123", "key_999");

    expect(result).toBe(false);
    expect(mocks.usageApiKeyDelete).not.toHaveBeenCalled();
  });

  it("deletes and returns true when key is found", async () => {
    mocks.usageApiKeyFindFirst.mockResolvedValueOnce(createApiKey());
    mocks.usageApiKeyDelete.mockResolvedValueOnce(undefined);

    const result = await deleteUsageApiKey("user_123", "key_123");

    expect(mocks.usageApiKeyDelete).toHaveBeenCalledWith({
      where: { id: "key_123" },
    });
    expect(result).toBe(true);
  });
});
