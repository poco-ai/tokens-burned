import { describe, expect, it } from "vitest";
import type { ApiSettings } from "../domain/types";
import { buildUploadManifestScope } from "../domain/upload-manifest";
import { resolveSnapshotResetDeviceId } from "./sync-service";

const settings: ApiSettings = {
  schemaVersion: 2,
  projectHashSalt: "salt-1",
  projectMode: "hashed",
  timezone: "UTC",
};

function makePrevious(deviceId = "device-1") {
  return {
    buckets: {},
    sessions: {},
    updatedAt: "2026-04-18T12:00:00.000Z",
    version: 1 as const,
    scope: buildUploadManifestScope({
      apiKey: "ta_test_1",
      apiUrl: "https://token.poco-ai.com",
      deviceId,
      settings,
    }),
  };
}

describe("resolveSnapshotResetDeviceId", () => {
  it("returns the previous device id for project identity changes", () => {
    expect(
      resolveSnapshotResetDeviceId({
        previous: makePrevious("device-prev"),
        scopeChangedReasons: ["project_identity"],
      }),
    ).toBe("device-prev");
  });

  it("returns the previous device id for snapshot protocol upgrades", () => {
    expect(
      resolveSnapshotResetDeviceId({
        previous: makePrevious("device-prev"),
        scopeChangedReasons: ["snapshot_protocol"],
      }),
    ).toBe("device-prev");
  });

  it("skips remote resets when the server or API key changed", () => {
    expect(
      resolveSnapshotResetDeviceId({
        previous: makePrevious("device-prev"),
        scopeChangedReasons: ["project_identity", "server_or_api_key"],
      }),
    ).toBeNull();
  });
});
