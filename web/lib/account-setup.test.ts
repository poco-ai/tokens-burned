import { describe, expect, it, vi } from "vitest";
import {
  getAuthenticatedAppPath,
  needsUsernameSetup,
  redirectIfUsernameSetupNeeded,
} from "./account-setup";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

describe("needsUsernameSetup", () => {
  it("returns true when usernameNeedsSetup is true", () => {
    expect(needsUsernameSetup({ usernameNeedsSetup: true })).toBe(true);
  });

  it("returns false when usernameNeedsSetup is false", () => {
    expect(needsUsernameSetup({ usernameNeedsSetup: false })).toBe(false);
  });

  it("returns false when user is null", () => {
    expect(needsUsernameSetup(null)).toBe(false);
  });

  it("returns false when user is undefined", () => {
    expect(needsUsernameSetup(undefined)).toBe(false);
  });
});

describe("getAuthenticatedAppPath", () => {
  it("returns settings account path when setup is needed", () => {
    const result = getAuthenticatedAppPath("en", {
      usernameNeedsSetup: true,
    });
    expect(result).toBe("/en/settings/account");
  });

  it("returns usage path when no setup is needed", () => {
    const result = getAuthenticatedAppPath("en", {
      usernameNeedsSetup: false,
    });
    expect(result).toBe("/en/usage");
  });
});

describe("redirectIfUsernameSetupNeeded", () => {
  it("calls redirect when username setup is needed", () => {
    redirectIfUsernameSetupNeeded("en", { usernameNeedsSetup: true });
    expect(mocks.redirect).toHaveBeenCalledWith("/en/settings/account");
  });

  it("does not call redirect when username setup is not needed", () => {
    mocks.redirect.mockClear();
    redirectIfUsernameSetupNeeded("en", { usernameNeedsSetup: false });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
