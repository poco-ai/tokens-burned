import { describe, expect, it } from "vitest";
import { resolveCodexProject } from "./codex";

describe("resolveCodexProject", () => {
  it("extracts the folder name from a Windows cwd", () => {
    expect(
      resolveCodexProject({
        cwd: "D:\\Project\\tokens-burned",
      }),
    ).toBe("tokens-burned");
  });

  it("prefers the repository slug when available", () => {
    expect(
      resolveCodexProject({
        cwd: "D:\\Project\\tokens-burned",
        git: {
          repository_url: "https://github.com/poco-ai/tokens-burned.git",
        },
      }),
    ).toBe("poco-ai/tokens-burned");
  });
});
