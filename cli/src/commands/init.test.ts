import { describe, expect, it } from "vitest";
import { getBrowserLaunchCommand, resolveShellAliasSetup } from "./init";

describe("getBrowserLaunchCommand", () => {
  it("uses cmd.exe start on Windows", () => {
    expect(getBrowserLaunchCommand("https://example.com", "win32")).toEqual({
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "start", "", "https://example.com"],
    });
  });

  it("uses open on macOS", () => {
    expect(getBrowserLaunchCommand("https://example.com", "darwin")).toEqual({
      command: "open",
      args: ["https://example.com"],
    });
  });

  it("uses xdg-open on Linux", () => {
    expect(getBrowserLaunchCommand("https://example.com", "linux")).toEqual({
      command: "xdg-open",
      args: ["https://example.com"],
    });
  });
});

describe("resolveShellAliasSetup", () => {
  it("returns a PowerShell profile on Windows when no SHELL is set", () => {
    const setup = resolveShellAliasSetup({
      currentPlatform: "win32",
      env: {},
      homeDir: "C:\\Users\\tester",
      resolvePowerShellProfilePath: () =>
        "C:\\Users\\tester\\Documents\\PowerShell\\Microsoft.PowerShell_profile.ps1",
    });

    expect(setup).toEqual({
      aliasLine: "Set-Alias -Name ta -Value tokenarena",
      aliasPatterns: [
        "set-alias -name ta",
        "set-alias ta",
        "new-alias ta",
        "function ta",
      ],
      configFile:
        "C:\\Users\\tester\\Documents\\PowerShell\\Microsoft.PowerShell_profile.ps1",
      shellLabel: "PowerShell",
      sourceHint: ". $PROFILE",
    });
  });

  it("keeps using Unix shell config when Git Bash provides SHELL on Windows", () => {
    const setup = resolveShellAliasSetup({
      currentPlatform: "win32",
      env: {
        SHELL: "C:\\Program Files\\Git\\bin\\bash.exe",
      },
      exists: () => false,
      homeDir: "C:\\Users\\tester",
    });

    expect(setup?.configFile).toBe("C:\\Users\\tester\\.bashrc");
    expect(setup?.shellLabel).toBe("bash");
  });

  it("returns zsh setup on macOS with zsh", () => {
    const setup = resolveShellAliasSetup({
      currentPlatform: "darwin",
      env: { SHELL: "/bin/zsh" },
      homeDir: "/Users/tester",
    });

    expect(setup?.shellLabel).toBe("zsh");
    expect(setup?.configFile).toBe("/Users/tester/.zshrc");
    expect(setup?.aliasLine).toContain("alias ta=");
  });

  it("returns bash setup with .bashrc on Linux", () => {
    const setup = resolveShellAliasSetup({
      currentPlatform: "linux",
      env: { SHELL: "/bin/bash" },
      homeDir: "/home/tester",
      exists: () => false,
    });

    expect(setup?.shellLabel).toBe("bash");
    expect(setup?.configFile).toBe("/home/tester/.bashrc");
  });

  it("returns bash setup with .bash_profile on macOS when it exists", () => {
    const setup = resolveShellAliasSetup({
      currentPlatform: "darwin",
      env: { SHELL: "/bin/bash" },
      homeDir: "/Users/tester",
      exists: (path: string) => path.endsWith(".bash_profile"),
    });

    expect(setup?.shellLabel).toBe("bash");
    expect(setup?.configFile).toBe("/Users/tester/.bash_profile");
  });

  it("returns fish setup", () => {
    const setup = resolveShellAliasSetup({
      currentPlatform: "linux",
      env: { SHELL: "/usr/bin/fish" },
      homeDir: "/home/tester",
    });

    expect(setup?.shellLabel).toBe("fish");
    expect(setup?.configFile).toContain("fish/config.fish");
  });

  it("returns null for unknown shell", () => {
    const setup = resolveShellAliasSetup({
      currentPlatform: "linux",
      env: { SHELL: "/usr/bin/nushell" },
      homeDir: "/home/tester",
    });

    expect(setup).toBeNull();
  });
});
