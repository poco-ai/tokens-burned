import { describe, expect, it } from "vitest";
import {
  fromFollowTagSelectValue,
  toFollowTagSelectValue,
} from "./follow-tags";

describe("toFollowTagSelectValue", () => {
  it('returns "none" when tag is null', () => {
    expect(toFollowTagSelectValue(null)).toBe("none");
  });

  it('returns "none" when tag is undefined', () => {
    expect(toFollowTagSelectValue(undefined)).toBe("none");
  });

  it("returns the tag when a valid tag is provided", () => {
    expect(toFollowTagSelectValue("coworker")).toBe("coworker");
  });
});

describe("fromFollowTagSelectValue", () => {
  it('returns null when value is "none"', () => {
    expect(fromFollowTagSelectValue("none")).toBeNull();
  });

  it("returns the value when it is a valid tag", () => {
    expect(fromFollowTagSelectValue("friend")).toBe("friend");
  });
});
