import { describe, expect, it } from "vitest";
import {
  parseSettingsSectionParam,
  SETTINGS_CLI_KEY_CREATE_QUERY,
  settingsCliKeysHrefWithCreateDialog,
  settingsSectionToPath,
} from "./settings-routes";

describe("settingsSectionToPath", () => {
  it('maps "cliKeys" to "cli-keys"', () => {
    expect(settingsSectionToPath("cliKeys")).toBe("cli-keys");
  });

  it('passes through "account" unchanged', () => {
    expect(settingsSectionToPath("account")).toBe("account");
  });

  it('passes through "preferences" unchanged', () => {
    expect(settingsSectionToPath("preferences")).toBe("preferences");
  });

  it('passes through "authentication" unchanged', () => {
    expect(settingsSectionToPath("authentication")).toBe("authentication");
  });
});

describe("parseSettingsSectionParam", () => {
  it("returns the matching section id for a known segment", () => {
    expect(parseSettingsSectionParam("account")).toBe("account");
    expect(parseSettingsSectionParam("cli-keys")).toBe("cliKeys");
    expect(parseSettingsSectionParam("preferences")).toBe("preferences");
    expect(parseSettingsSectionParam("authentication")).toBe("authentication");
  });

  it("returns null for an unknown segment", () => {
    expect(parseSettingsSectionParam("unknown")).toBeNull();
    expect(parseSettingsSectionParam("")).toBeNull();
  });
});

describe("settingsCliKeysHrefWithCreateDialog", () => {
  it("returns the CLI keys path with create=1 query param", () => {
    expect(settingsCliKeysHrefWithCreateDialog()).toBe(
      "/settings/cli-keys?create=1",
    );
  });
});

describe("SETTINGS_CLI_KEY_CREATE_QUERY", () => {
  it("has name 'create' and value '1'", () => {
    expect(SETTINGS_CLI_KEY_CREATE_QUERY).toEqual({
      name: "create",
      value: "1",
    });
  });
});
