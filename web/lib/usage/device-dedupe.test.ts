import { describe, expect, it } from "vitest";

import {
  buildDeviceDedupeIndex,
  dedupeRowsByDeviceGroup,
  resolveDeviceFilterIds,
} from "./device-dedupe";

describe("buildDeviceDedupeIndex", () => {
  it("groups device aliases by shared fingerprint and keeps the earliest device as canonical", () => {
    const index = buildDeviceDedupeIndex([
      {
        deviceId: "22222222-beta",
        hostname: "MacBook-Pro",
        deviceFingerprint: "fp-shared",
        firstSeenAt: new Date("2026-03-21T00:00:00.000Z"),
      },
      {
        deviceId: "11111111-alpha",
        hostname: "MacBook-Pro",
        deviceFingerprint: "fp-shared",
        firstSeenAt: new Date("2026-03-20T00:00:00.000Z"),
      },
    ]);

    expect(index.canonicalDevices.map((device) => device.deviceId)).toEqual([
      "11111111-alpha",
    ]);
    expect(resolveDeviceFilterIds(index, "11111111-alpha")).toEqual([
      "11111111-alpha",
      "22222222-beta",
    ]);
  });
});

describe("dedupeRowsByDeviceGroup", () => {
  it("keeps the newest logical record and normalizes it onto the canonical device id", () => {
    const index = buildDeviceDedupeIndex([
      {
        deviceId: "11111111-alpha",
        hostname: "MacBook-Pro",
        deviceFingerprint: "fp-shared",
        firstSeenAt: new Date("2026-03-20T00:00:00.000Z"),
      },
      {
        deviceId: "22222222-beta",
        hostname: "MacBook-Pro",
        deviceFingerprint: "fp-shared",
        firstSeenAt: new Date("2026-03-21T00:00:00.000Z"),
      },
    ]);

    const rows = dedupeRowsByDeviceGroup(
      [
        {
          deviceId: "11111111-alpha",
          source: "codex",
          sessionHash: "hash-1",
          updatedAt: new Date("2026-03-25T12:30:00.000Z"),
        },
        {
          deviceId: "22222222-beta",
          source: "codex",
          sessionHash: "hash-1",
          updatedAt: new Date("2026-03-25T12:35:00.000Z"),
        },
      ],
      index,
      (row, deviceGroupKey) =>
        [deviceGroupKey, row.source, row.sessionHash].join("|"),
    );

    expect(rows).toEqual([
      {
        deviceId: "11111111-alpha",
        source: "codex",
        sessionHash: "hash-1",
        updatedAt: new Date("2026-03-25T12:35:00.000Z"),
      },
    ]);
  });
});
