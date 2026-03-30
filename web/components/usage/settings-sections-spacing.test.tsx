import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { KeyManager } from "./key-manager";
import { SettingsPreferences } from "./settings-preferences";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) =>
    ({
      preferencesTitle: "Preferences",
      saving: "Saving...",
      saved: "Saved",
      timezone: "Timezone",
      projectMode: "Project mode",
      publicProfile: "Public profile",
      selectTimezone: "Select timezone",
      selectProjectMode: "Select project mode",
      selectPublicProfile: "Select public profile",
      "projectModes.hashed": "Hashed",
      "projectModes.raw": "Raw",
      "projectModes.disabled": "Disabled",
      "publicProfileOptions.disabled": "Disabled",
      "publicProfileOptions.enabled": "Enabled",
      pageTitle: "CLI API Keys",
      dialogTitle: "API Keys",
      total: "1 total",
      active: "1 active",
      createKey: "Create key",
      requestFailed: "Request failed.",
      copyFailed: "Copy failed.",
      newKey: "New key",
      copyShownOnce: "Copy it now.",
      copyKey: "Copy key",
      "table.name": "Name",
      "table.prefix": "Prefix",
      "table.status": "Status",
      "table.lastUsed": "Last Used",
      "table.created": "Created",
      "table.actions": "Actions",
      "table.never": "Never",
      "status.active": "active",
      "status.disabled": "disabled",
      "actions.rename": "Rename key",
      "actions.disable": "Disable key",
      "actions.enable": "Enable key",
      "actions.delete": "Delete key",
      "dialog.createTitle": "Create CLI key",
      "dialog.renameTitle": "Rename CLI key",
      "dialog.createDescription": "Description",
      "dialog.renameDescription": "Description",
      "dialog.name": "Name",
      "dialog.placeholder": "My MacBook / Work",
      "dialog.saving": "Saving...",
      "dialog.createKey": "Create key",
      "dialog.saveChanges": "Save changes",
    })[key] ?? key,
}));

describe("settings dialog section spacing", () => {
  it("renders the preferences section without language/theme and keeps key fields on one row", () => {
    const markup = renderToStaticMarkup(
      <SettingsPreferences
        initialTimezone="Asia/Shanghai"
        initialProjectMode="raw"
        initialPublicProfileEnabled={false}
      />,
    );

    expect(markup).toContain("space-y-3");
    expect(markup).toContain("grid gap-3 md:grid-cols-2");
    expect(markup).toContain("space-y-1.5");
    expect(markup).toContain("md:col-span-2");
    expect(markup).toContain("w-full border-border/60 bg-background");
    expect(markup).not.toContain("language-switcher");
    expect(markup).not.toContain("theme-switcher");
    expect(markup).not.toContain("space-y-4 pt-4");
  });

  it("renders the api keys section with tighter header and content spacing", () => {
    const markup = renderToStaticMarkup(
      <KeyManager
        initialKeys={[
          {
            id: "key_123",
            name: "test",
            prefix: "ta_5de06989",
            status: "active",
            lastUsedAt: "2026-03-26T09:05:35.000Z",
            createdAt: "2026-03-26T08:44:25.000Z",
          },
        ]}
        variant="dialog"
      />,
    );

    expect(markup).toContain("space-y-3");
    expect(markup).toContain("justify-between");
    expect(markup).not.toContain("amber-");
    expect(markup).not.toContain("space-y-4 pt-4");
  });
});
