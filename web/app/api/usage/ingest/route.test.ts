import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUsageApiKeyByRaw: vi.fn(),
  deleteUsageDeviceSnapshot: vi.fn(),
  ingestUsagePayload: vi.fn(),
}));

vi.mock("@/lib/usage/api-keys", () => ({
  findUsageApiKeyByRaw: mocks.findUsageApiKeyByRaw,
}));

vi.mock("@/lib/usage/ingest", () => ({
  deleteUsageDeviceSnapshot: mocks.deleteUsageDeviceSnapshot,
  ingestUsagePayload: mocks.ingestUsagePayload,
}));

describe("usage ingest route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated delete requests", async () => {
    mocks.findUsageApiKeyByRaw.mockResolvedValue(null);

    const { DELETE } = await import("@/app/api/usage/ingest/route");
    const response = await DELETE(
      new Request("https://example.com/api/usage/ingest?deviceId=device-1234", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects delete requests without a device id", async () => {
    mocks.findUsageApiKeyByRaw.mockResolvedValue({
      id: "key-1",
      userId: "user-1",
    });

    const { DELETE } = await import("@/app/api/usage/ingest/route");
    const response = await DELETE(
      new Request("https://example.com/api/usage/ingest", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer ta_test_123",
        },
      }),
    );

    expect(response.status).toBe(400);
  });

  it("deletes the requested device snapshot", async () => {
    mocks.findUsageApiKeyByRaw.mockResolvedValue({
      id: "key-1",
      userId: "user-1",
    });
    mocks.deleteUsageDeviceSnapshot.mockResolvedValue({
      deletedBuckets: 4,
      deletedSessions: 2,
    });

    const { DELETE } = await import("@/app/api/usage/ingest/route");
    const response = await DELETE(
      new Request("https://example.com/api/usage/ingest?deviceId=device-1234", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer ta_test_123",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.deleteUsageDeviceSnapshot).toHaveBeenCalledWith({
      userId: "user-1",
      deviceId: "device-1234",
    });
    await expect(response.json()).resolves.toEqual({
      deletedBuckets: 4,
      deletedSessions: 2,
    });
  });
});
