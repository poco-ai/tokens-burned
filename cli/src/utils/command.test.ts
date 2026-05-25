import { platform } from "node:os";
import { describe, expect, it } from "vitest";
import { isCommandAvailable } from "./command";

describe("isCommandAvailable", () => {
  it("returns true for commands that exist", () => {
    // Use a command that exists on all platforms
    const cmd = platform() === "win32" ? "cmd" : "ls";
    expect(isCommandAvailable(cmd)).toBe(true);
  });

  it("returns false for commands that do not exist", () => {
    expect(isCommandAvailable("nonexistent_command_xyz_12345")).toBe(false);
  });
});
