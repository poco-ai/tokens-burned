// @vitest-environment jsdom

import type * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsDialog } from "./settings-dialog";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    ({
      button: "Settings",
      title: "Settings",
      description: "Manage preferences and CLI API keys.",
      navAccount: "Account",
      navPreferences: "Preferences",
      navAuthentication: "Authentication",
      navCliKeys: "CLI keys",
      panelAccountDescription: "Account panel",
      panelPreferencesDescription: "Preferences panel",
      panelAuthenticationDescription: "Auth panel",
      panelCliKeysDescription: "Keys panel",
    })[key] ?? key,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ComponentProps<"button"> & { children?: React.ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("./key-manager", () => ({
  KeyManager: () => <div data-slot="key-manager" />,
}));

vi.mock("./account-identity-card", () => ({
  AccountIdentityCard: () => <div data-slot="account-identity-card" />,
}));

vi.mock("./connected-accounts-card", () => ({
  ConnectedAccountsCard: () => <div data-slot="connected-accounts-card" />,
}));

vi.mock("@/components/usage/settings-page-header", () => ({
  SettingsPageHeader: () => <div data-slot="settings-page-header" />,
}));

vi.mock("./settings-preferences", () => ({
  SettingsPreferences: ({
    initialTimezone,
    initialProjectMode,
    initialPublicProfileEnabled,
  }: {
    initialTimezone: string;
    initialProjectMode: string;
    initialPublicProfileEnabled: boolean;
  }) => (
    <div
      data-project-mode={initialProjectMode}
      data-public-profile={String(initialPublicProfileEnabled)}
      data-slot="settings-preferences"
      data-timezone={initialTimezone}
    />
  ),
}));

describe("SettingsDialog", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });

    delete (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT;
    container.remove();
  });

  it("updates its preference props after a saved-preference event", () => {
    act(() => {
      root.render(
        <SettingsDialog
          initialTimezone="UTC"
          initialProjectMode="raw"
          initialPublicProfileEnabled={false}
          initialBio={null}
          initialKeys={[]}
        />,
      );
    });

    const preferenceTab = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Preferences"),
    );

    act(() => {
      preferenceTab?.click();
    });

    const preferences = container.querySelector(
      '[data-slot="settings-preferences"]',
    );

    expect(preferences?.getAttribute("data-timezone")).toBe("UTC");
    expect(preferences?.getAttribute("data-project-mode")).toBe("raw");
    expect(preferences?.getAttribute("data-public-profile")).toBe("false");

    act(() => {
      window.dispatchEvent(
        new CustomEvent("tokenarena:preference-notice", {
          detail: {
            type: "saved",
            preference: {
              timezone: "Asia/Shanghai",
              projectMode: "hashed",
              publicProfileEnabled: true,
              bio: "Building with AI",
            },
          },
        }),
      );
    });

    const updatedPreferences = container.querySelector(
      '[data-slot="settings-preferences"]',
    );

    expect(updatedPreferences?.getAttribute("data-timezone")).toBe(
      "Asia/Shanghai",
    );
    expect(updatedPreferences?.getAttribute("data-project-mode")).toBe(
      "hashed",
    );
    expect(updatedPreferences?.getAttribute("data-public-profile")).toBe(
      "true",
    );
  });
});
