import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { KeyManager } from "./key-manager";
import { SettingsPreferences } from "./settings-preferences";

describe("settings dialog section spacing", () => {
  it("renders the preferences section with tighter header and field spacing", () => {
    const markup = renderToStaticMarkup(
      <SettingsPreferences
        initialTimezone="Asia/Shanghai"
        initialProjectMode="raw"
      />,
    );

    expect(markup).toContain("border-b border-border/50 pb-2");
    expect(markup).toContain("space-y-3 pt-3");
    expect(markup).toContain("grid gap-3 lg:grid-cols-2");
    expect(markup).toContain("space-y-1.5");
    expect(markup).not.toContain("space-y-4 pt-4");
  });

  it("renders the api keys section with tighter header and content spacing", () => {
    const markup = renderToStaticMarkup(
      <KeyManager
        initialKeys={[
          {
            id: "key_123",
            name: "test",
            prefix: "vbu_5de06989",
            status: "active",
            lastUsedAt: "2026-03-26T09:05:35.000Z",
            createdAt: "2026-03-26T08:44:25.000Z",
          },
        ]}
        variant="dialog"
      />,
    );

    expect(markup).toContain("gap-2 border-b border-border/50 pb-2");
    expect(markup).toContain("space-y-3 pt-3");
    expect(markup).not.toContain("space-y-4 pt-4");
  });
});
