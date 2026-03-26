import { describe, expect, it } from "vitest";

import { formatProjectLabel } from "./project";

describe("formatProjectLabel", () => {
  it("renders hashed project labels", () => {
    expect(formatProjectLabel("hashed", "a1b2c3d4e5f6")).toBe("Project a1b2c3");
  });
});
