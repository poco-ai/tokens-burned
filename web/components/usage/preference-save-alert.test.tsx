// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreferenceSaveAlert } from "./preference-save-alert";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    ({
      saveAlertTitle: "Preferences saved",
      dismissSaveAlert: "Dismiss saved alert",
    })[key] ?? key,
}));

describe("PreferenceSaveAlert", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.useFakeTimers();
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
    vi.useRealTimers();
    delete (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT;
    container.remove();
  });

  it("shows a page-level saved alert after preferences are persisted", () => {
    act(() => {
      root.render(<PreferenceSaveAlert />);
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("tokenarena:preference-notice", {
          detail: {
            type: "saved",
            preference: {
              timezone: "Asia/Shanghai",
              projectMode: "hashed",
              publicProfileEnabled: false,
              bio: null,
            },
          },
        }),
      );
    });

    expect(document.body.textContent).toContain("Preferences saved");
  });

  it("auto dismisses the saved alert after a short delay", () => {
    act(() => {
      root.render(<PreferenceSaveAlert />);
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("tokenarena:preference-notice", {
          detail: {
            type: "saved",
            preference: {
              timezone: "Asia/Shanghai",
              projectMode: "hashed",
              publicProfileEnabled: false,
              bio: null,
            },
          },
        }),
      );
    });

    expect(document.body.textContent).toContain("Preferences saved");

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(document.body.textContent).not.toContain("Preferences saved");
  });
});
