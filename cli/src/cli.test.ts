import { describe, expect, it } from "vitest";
import { createCli } from "./cli";

describe("createCli", () => {
  it("registers the daemon command and removes the service command", () => {
    const program = createCli();
    const commandNames = program.commands.map((command) => command.name());

    expect(commandNames).toContain("daemon");
    expect(commandNames).not.toContain("service");
  });
});
