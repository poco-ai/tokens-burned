import { describe, expect, it } from "vitest";
import { isValidUsername, normalizeUsername } from "./auth-username";

describe("normalizeUsername", () => {
  it("trims and lowercases the username", () => {
    expect(normalizeUsername("  Hello  ")).toBe("hello");
  });
});

describe("isValidUsername", () => {
  it("returns true for a valid username", () => {
    expect(isValidUsername("valid_name123")).toBe(true);
  });

  it("returns false for a username with spaces and special characters", () => {
    expect(isValidUsername("invalid name!")).toBe(false);
  });

  it("returns true for a short username that matches the pattern", () => {
    expect(isValidUsername("ab")).toBe(true);
  });
});
