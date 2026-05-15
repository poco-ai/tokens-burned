import { describe, expect, it } from "vitest";

import {
  formatDateInput,
  formatDateTime,
  formatDuration,
  formatPercentage,
  formatTokenCount,
  formatUsdAmount,
  formatUsdRatePerMillion,
} from "./format";

describe("usage format helpers", () => {
  it("formats token counts with K/M/B suffixes", () => {
    expect(formatTokenCount(999)).toBe("999");
    expect(formatTokenCount(1000)).toBe("1K");
    expect(formatTokenCount(12345)).toBe("12.3K");
    expect(formatTokenCount(1234567)).toBe("1.2M");
    expect(formatTokenCount(1234567890)).toBe("1.2B");
  });

  it("formats durations using compact units", () => {
    expect(formatDuration(3665)).toBe("1h 1m");
    expect(formatDuration(42)).toBe("42s");
  });

  it("formats compact durations for dense delta badges", () => {
    expect(formatDuration(24300, { compact: true })).toBe("6h45m");
    expect(formatDuration(3665, { compact: true })).toBe("1h1m");
    expect(formatDuration(42, { compact: true })).toBe("42s");
  });

  it("formats percentages for shares", () => {
    expect(formatPercentage(0.256)).toBe("25.6%");
  });

  it("formats USD rates per million tokens", () => {
    expect(formatUsdRatePerMillion(15)).toBe("$15/M");
    expect(formatUsdRatePerMillion(0.175)).toBe("$0.175/M");
  });

  it("formats date-only filter values in the account timezone", () => {
    expect(
      formatDateInput(new Date("2026-03-25T16:00:00.000Z"), "Asia/Shanghai"),
    ).toBe("2026-03-26");
  });

  it("formats date-times in the account timezone", () => {
    expect(
      formatDateTime(new Date("2026-03-25T16:00:00.000Z"), "Asia/Shanghai"),
    ).toContain("2026");
  });

  it("formatUsdAmount formats values >= $1 with standard precision", () => {
    expect(formatUsdAmount(42.5)).toBe("$42.50");
    expect(formatUsdAmount(1)).toBe("$1.00");
  });

  it("formatUsdAmount uses compact format for large values with compact option", () => {
    const result = formatUsdAmount(1500, "en", { compact: true });
    expect(result).toContain("K");
  });

  it("formatUsdAmount formats small values (< $0.01) with more decimals", () => {
    const result = formatUsdAmount(0.005);
    expect(result).toBe("$0.005");
  });

  it("formatUsdAmount formats tiny values with maximum precision", () => {
    const result = formatUsdAmount(0.001);
    expect(result).toBe("$0.001");
  });

  it("formatTokenCount handles negative values", () => {
    expect(formatTokenCount(-500)).toBe("-500");
    expect(formatTokenCount(-1500)).toBe("-1.5K");
    expect(formatTokenCount(-1500000)).toBe("-1.5M");
  });

  it("formatDuration returns 0s for zero seconds", () => {
    expect(formatDuration(0)).toBe("0s");
  });

  it("formatDuration returns 0s for negative seconds", () => {
    expect(formatDuration(-10)).toBe("0s");
  });

  it("formatDuration handles hours only (no remaining minutes)", () => {
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(7200)).toBe("2h");
  });

  it("formatUsdRatePerMillion uses fewer decimals for values >= 1", () => {
    expect(formatUsdRatePerMillion(1)).toBe("$1/M");
    expect(formatUsdRatePerMillion(10.5)).toBe("$10.5/M");
  });
});
