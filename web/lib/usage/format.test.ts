import { describe, expect, it } from "vitest";

import {
  formatDateInput,
  formatDateTime,
  formatDuration,
  formatPercentage,
  formatTokenCount,
} from "./format";

describe("usage format helpers", () => {
  it("formats token counts with K/M/B suffixes", () => {
    expect(formatTokenCount(999)).toBe("999");
    expect(formatTokenCount(1000)).toBe("1.0K");
    expect(formatTokenCount(12345)).toBe("12.3K");
    expect(formatTokenCount(1234567)).toBe("1.2M");
    expect(formatTokenCount(1234567890)).toBe("1.2B");
  });

  it("formats durations using compact units", () => {
    expect(formatDuration(3665)).toBe("1h 1m");
    expect(formatDuration(42)).toBe("42s");
  });

  it("formats percentages for shares", () => {
    expect(formatPercentage(0.256)).toBe("25.6%");
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
});
