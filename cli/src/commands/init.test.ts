import { describe, expect, it } from "vitest";
import { getBrowserLaunchCommand, resolveShellAliasSetup } from "./init";

describe("getBrowserLaunchCommand", () => {
  it("uses cmd.exe start on Windows", () => {
    expect(getBrowserLaunchCommand("https://example.com", "win32")).toEqual({
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "start", "", "https://example.com"],
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
});
