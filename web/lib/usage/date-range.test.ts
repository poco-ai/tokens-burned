import { describe, expect, it } from "vitest";

import {
  getPreviousRange,
  groupByHourOrDay,
  listRangeBuckets,
  resolveDashboardRange,
  toZonedParts,
} from "./date-range";

describe("resolveDashboardRange", () => {
  it("supports date-only custom ranges in the account timezone", () => {
    const result = resolveDashboardRange({
      preset: "custom",
      from: "2026-03-26",
      to: "2026-03-27",
      timezone: "Asia/Shanghai",
    });

    expect(result.from.toISOString()).toBe("2026-03-25T16:00:00.000Z");
    expect(result.to.toISOString()).toBe("2026-03-27T15:59:59.999Z");
    expect(result.granularity).toBe("day");
  });

  it("supports date-only custom ranges in negative UTC offsets", () => {
    const result = resolveDashboardRange({
      preset: "custom",
      from: "2026-03-26",
      to: "2026-03-27",
      timezone: "America/Los_Angeles",
    });

    expect(result.from.toISOString()).toBe("2026-03-26T07:00:00.000Z");
    expect(result.to.toISOString()).toBe("2026-03-28T06:59:59.999Z");
  });

  it("uses hourly buckets for 1D", () => {
    const result = resolveDashboardRange({
      preset: "1d",
      timezone: "UTC",
      now: new Date("2026-03-26T12:00:00.000Z"),
    });

    expect(result.granularity).toBe("hour");
  });

  it("resolves a 7d preset to a 7-day range with day granularity", () => {
    const result = resolveDashboardRange({
      preset: "7d",
      timezone: "UTC",
      now: new Date("2026-03-26T12:00:00.000Z"),
    });

    expect(result.preset).toBe("7d");
    expect(result.granularity).toBe("day");
    expect(result.timezone).toBe("UTC");
    expect(result.from.toISOString()).toBe("2026-03-20T00:00:00.000Z");
    expect(result.to.toISOString()).toBe("2026-03-26T12:00:00.000Z");
  });

  it("resolves a 30d preset to a 30-day range with day granularity", () => {
    const result = resolveDashboardRange({
      preset: "30d",
      timezone: "UTC",
      now: new Date("2026-03-26T12:00:00.000Z"),
    });

    expect(result.preset).toBe("30d");
    expect(result.granularity).toBe("day");
    expect(result.from.toISOString()).toBe("2026-02-25T00:00:00.000Z");
    expect(result.to.toISOString()).toBe("2026-03-26T12:00:00.000Z");
  });
});

describe("getPreviousRange", () => {
  it("shifts the range backward by the same duration", () => {
    const range = resolveDashboardRange({
      preset: "7d",
      timezone: "UTC",
      now: new Date("2026-03-26T12:00:00.000Z"),
    });
    const previous = getPreviousRange(range);

    expect(previous.from.getTime()).toBe(
      range.from.getTime() - (range.to.getTime() - range.from.getTime()),
    );
    expect(previous.to.getTime()).toBe(range.from.getTime());
    expect(previous.preset).toBe(range.preset);
    expect(previous.timezone).toBe(range.timezone);
    expect(previous.granularity).toBe(range.granularity);
  });
});

describe("groupByHourOrDay", () => {
  it("groups by hour when range granularity is hour", () => {
    const range = resolveDashboardRange({
      preset: "1d",
      timezone: "UTC",
      now: new Date("2026-03-26T12:30:00.000Z"),
    });

    const key = groupByHourOrDay(range, new Date("2026-03-26T08:45:00.000Z"));
    expect(key).toBe("2026-03-26 08:00");
  });

  it("groups by day when range granularity is day", () => {
    const range = resolveDashboardRange({
      preset: "7d",
      timezone: "UTC",
      now: new Date("2026-03-26T12:00:00.000Z"),
    });

    const key = groupByHourOrDay(range, new Date("2026-03-24T15:30:00.000Z"));
    expect(key).toBe("2026-03-24");
  });
});

describe("listRangeBuckets", () => {
  it("generates hourly buckets for a 1d range", () => {
    const range = resolveDashboardRange({
      preset: "1d",
      timezone: "UTC",
      now: new Date("2026-03-26T05:00:00.000Z"),
    });

    const buckets = listRangeBuckets(range);

    expect(buckets.length).toBe(6);
    expect(buckets[0]?.key).toBe("2026-03-26 00:00");
    expect(buckets[5]?.key).toBe("2026-03-26 05:00");
  });

  it("generates daily buckets for a 7d range", () => {
    const range = resolveDashboardRange({
      preset: "7d",
      timezone: "UTC",
      now: new Date("2026-03-26T00:00:00.000Z"),
    });

    const buckets = listRangeBuckets(range);

    expect(buckets).toHaveLength(7);
    expect(buckets[0]?.key).toBe("2026-03-20");
    expect(buckets[6]?.key).toBe("2026-03-26");
  });
});

describe("toZonedParts", () => {
  it("extracts date/time parts in the specified timezone", () => {
    const parts = toZonedParts(new Date("2026-03-26T08:30:45.000Z"), "UTC");

    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(3);
    expect(parts.day).toBe(26);
    expect(parts.hour).toBe(8);
    expect(parts.minute).toBe(30);
    expect(parts.second).toBe(45);
  });

  it("converts to a timezone with positive offset", () => {
    const parts = toZonedParts(
      new Date("2026-03-26T08:30:45.000Z"),
      "Asia/Shanghai",
    );

    expect(parts.hour).toBe(16);
    expect(parts.day).toBe(26);
  });
});
