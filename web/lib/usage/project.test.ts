import { describe, expect, it } from "vitest";

import { formatProjectLabel } from "./project";

describe("formatProjectLabel", () => {
  it("renders hashed project labels", () => {
    expect(formatProjectLabel("hashed", "a1b2c3d4e5f6")).toBe("Project a1b2c3");
  });

  it("returns rawName when mode is raw and rawName is provided", () => {
    expect(formatProjectLabel("raw", "key123", "My Project")).toBe(
      "My Project",
    );
  });

  it("falls through to hashed format when mode is raw but rawName is null", () => {
    expect(formatProjectLabel("raw", "key123", null)).toBe("Project key123");
  });

  it("returns Unknown Project when mode is disabled", () => {
    expect(formatProjectLabel("disabled", "key123")).toBe("Unknown Project");
  });
});
