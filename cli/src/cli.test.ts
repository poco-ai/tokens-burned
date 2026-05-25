import { describe, expect, it } from "vitest";
import { createCli } from "./cli";

describe("createCli", () => {
  it("registers the daemon and service commands", () => {
    const program = createCli();
    const commandNames = program.commands.map((command) => command.name());

    expect(commandNames).toContain("daemon");
    expect(commandNames).toContain("service");
  });

  it("registers the status show option", () => {
    const program = createCli();
    const statusCommand = program.commands.find(
      (command) => command.name() === "status",
    );

    expect(statusCommand?.options.map((option) => option.long)).toContain(
      "--show",
    );
  });
});
