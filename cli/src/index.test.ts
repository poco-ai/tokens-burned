import { describe, expect, it } from "vitest";

import { normalizeArgv } from "./index";

describe("normalizeArgv", () => {
  it("removes standalone pnpm separators before commander parsing", () => {
    expect(normalizeArgv(["node", "tokens-burned", "--", "--help"])).toEqual([
      "node",
      "tokens-burned",
      "--help",
    ]);
  });
});
