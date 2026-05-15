import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAbsoluteUrl, getAppOrigin, resolveAppLocale } from "./site-url";

describe("resolveAppLocale", () => {
  it("returns the locale when it is supported", () => {
    expect(resolveAppLocale("zh")).toBe("zh");
  });

  it("returns defaultLocale when the locale is not supported", () => {
    expect(resolveAppLocale("xx")).toBe("en");
  });

  it("returns defaultLocale when value is null", () => {
    expect(resolveAppLocale(null)).toBe("en");
  });

  it("returns defaultLocale when value is undefined", () => {
    expect(resolveAppLocale(undefined)).toBe("en");
  });
});

describe("getAppOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns NEXT_PUBLIC_APP_ORIGIN when set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://example.com");
    expect(getAppOrigin()).toBe("https://example.com");
  });

  it("falls back to BETTER_AUTH_URL when NEXT_PUBLIC_APP_ORIGIN is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "");
    vi.stubEnv("BETTER_AUTH_URL", "https://auth.example.com");
    expect(getAppOrigin()).toBe("https://auth.example.com");
  });

  it("returns null when neither env var is set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "");
    vi.stubEnv("BETTER_AUTH_URL", "");
    expect(getAppOrigin()).toBeNull();
  });
});

describe("buildAbsoluteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a full URL when origin is available", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://example.com");
    expect(buildAbsoluteUrl("/path")).toBe("https://example.com/path");
  });

  it("returns null when no origin is available", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "");
    vi.stubEnv("BETTER_AUTH_URL", "");
    expect(buildAbsoluteUrl("/path")).toBeNull();
  });
});
