import { describe, expect, it } from "vitest";
import { detectInstalledTools, registerParser } from "./registry";
import type { IParser } from "./types";

describe("detectInstalledTools", () => {
  it("uses parser-specific installation detection when available", () => {
    const parser: IParser = {
      tool: {
        id: "test-installed-via-hook",
        name: "Test Tool",
        dataDir: "Z:\\path-that-does-not-exist",
      },
      parse: async () => ({ buckets: [], sessions: [] }),
      isInstalled: () => true,
    };

    registerParser(parser);

    const detected = detectInstalledTools().map((tool) => tool.id);
    expect(detected).toContain("test-installed-via-hook");
  });
});
