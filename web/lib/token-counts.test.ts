import { describe, expect, it } from "vitest";
import { tokenCountToBigInt, tokenCountToNumber } from "./token-counts";

describe("tokenCountToBigInt", () => {
  it("converts numbers to bigint for Prisma writes", () => {
    expect(tokenCountToBigInt(6_355_629_440)).toBe(BigInt(6_355_629_440));
  });

  it("returns BigInt(0) when value is null", () => {
    expect(tokenCountToBigInt(null)).toBe(BigInt(0));
  });

  it("returns BigInt(0) when value is undefined", () => {
    expect(tokenCountToBigInt(undefined)).toBe(BigInt(0));
  });

  it("returns a bigint as-is when value is already bigint", () => {
    expect(tokenCountToBigInt(BigInt(100))).toBe(BigInt(100));
  });
});

describe("tokenCountToNumber", () => {
  it("converts bigint values back to numbers for UI reads", () => {
    expect(tokenCountToNumber(BigInt(2_272_772_480))).toBe(2_272_772_480);
  });

  it("clamps values above the safe integer limit", () => {
    expect(
      tokenCountToNumber(BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1)),
    ).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("clamps values below the safe integer limit", () => {
    expect(
      tokenCountToNumber(BigInt(Number.MIN_SAFE_INTEGER) - BigInt(1)),
    ).toBe(Number.MIN_SAFE_INTEGER);
  });

  it("returns 0 when value is null", () => {
    expect(tokenCountToNumber(null)).toBe(0);
  });

  it("returns 0 when value is undefined", () => {
    expect(tokenCountToNumber(undefined)).toBe(0);
  });

  it("returns a plain number as-is", () => {
    expect(tokenCountToNumber(42)).toBe(42);
  });
});
