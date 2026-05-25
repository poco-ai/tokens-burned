import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  pickLinkedAccount,
  resolveLinkedProfileUrl,
} from "./linked-provider-profile";

describe("resolveLinkedProfileUrl", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("builds Linux.do profile links with the summary route", async () => {
    await expect(resolveLinkedProfileUrl("linuxdo", "philfan")).resolves.toBe(
      "https://linux.do/u/philfan/summary",
    );
  });

  it("encodes Linux.do account ids safely", async () => {
    await expect(
      resolveLinkedProfileUrl("linuxdo", "name with space"),
    ).resolves.toBe("https://linux.do/u/name%20with%20space/summary");
  });

  it("resolves numeric Linux.do account ids to usernames via the user API", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ username: "philfan" }),
    }) as typeof fetch;

    await expect(
      resolveLinkedProfileUrl("linuxdo", "294197", "token-123"),
    ).resolves.toBe("https://linux.do/u/philfan/summary");
  });

  it("hides Linux.do links when only a numeric id is available", async () => {
    await expect(resolveLinkedProfileUrl("linuxdo", "294197")).resolves.toBe(
      null,
    );
  });

  it("returns null for an unknown provider", async () => {
    await expect(
      resolveLinkedProfileUrl("unknown", "test"),
    ).resolves.toBeNull();
  });

  it("builds Watcha profile links", async () => {
    await expect(resolveLinkedProfileUrl("watcha", "testuser")).resolves.toBe(
      "https://watcha.cn/user/testuser",
    );
  });

  it("builds GitHub profile links for non-numeric account ids", async () => {
    await expect(resolveLinkedProfileUrl("github", "octocat")).resolves.toBe(
      "https://github.com/octocat",
    );
  });

  it("resolves GitHub numeric account ids via the user API", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ html_url: "https://github.com/found-user" }),
    }) as typeof fetch;

    await expect(resolveLinkedProfileUrl("github", "12345")).resolves.toBe(
      "https://github.com/found-user",
    );
  });

  it("returns null for GitHub numeric id when API response is not ok", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as typeof fetch;

    await expect(
      resolveLinkedProfileUrl("github", "12345"),
    ).resolves.toBeNull();
  });

  it("returns null for GitHub numeric id when API throws", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    await expect(
      resolveLinkedProfileUrl("github", "12345"),
    ).resolves.toBeNull();
  });

  it("returns null for GitHub numeric id when html_url is missing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as typeof fetch;

    await expect(
      resolveLinkedProfileUrl("github", "12345"),
    ).resolves.toBeNull();
  });

  it("returns null for GitHub when account id is empty/whitespace", async () => {
    await expect(resolveLinkedProfileUrl("github", "  ")).resolves.toBeNull();
  });

  it("returns null for Linux.do when account id is empty/whitespace", async () => {
    await expect(resolveLinkedProfileUrl("linuxdo", "  ")).resolves.toBeNull();
  });

  it("returns null for Linux.do numeric id when access token fetch fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("fail"));

    await expect(
      resolveLinkedProfileUrl("linuxdo", "294197", "some-token"),
    ).resolves.toBeNull();
  });

  it("returns null for Linux.do numeric id when API response is not ok", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
    }) as typeof fetch;

    await expect(
      resolveLinkedProfileUrl("linuxdo", "294197", "some-token"),
    ).resolves.toBeNull();
  });

  it("returns null for Linux.do numeric id when username is empty in response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ username: "" }),
    }) as typeof fetch;

    await expect(
      resolveLinkedProfileUrl("linuxdo", "294197", "some-token"),
    ).resolves.toBeNull();
  });

  it("returns null for Linux.do numeric id when username is missing in response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as typeof fetch;

    await expect(
      resolveLinkedProfileUrl("linuxdo", "294197", "some-token"),
    ).resolves.toBeNull();
  });

  it("returns null for Linux.do numeric id when access token is empty", async () => {
    await expect(
      resolveLinkedProfileUrl("linuxdo", "294197", ""),
    ).resolves.toBeNull();
  });

  it("returns null for Linux.do numeric id when access token is whitespace", async () => {
    await expect(
      resolveLinkedProfileUrl("linuxdo", "294197", "   "),
    ).resolves.toBeNull();
  });
});

describe("pickLinkedAccount", () => {
  it("prefers GitHub over Linux.do and Watcha", () => {
    const result = pickLinkedAccount([
      { providerId: "linuxdo", accountId: "linux_user" },
      { providerId: "github", accountId: "gh_user" },
      { providerId: "watcha", accountId: "w_user" },
    ]);

    expect(result).toEqual({
      providerId: "github",
      accountId: "gh_user",
      accessToken: undefined,
    });
  });

  it("picks Linux.do when GitHub is not present", () => {
    const result = pickLinkedAccount([
      { providerId: "watcha", accountId: "w_user" },
      { providerId: "linuxdo", accountId: "linux_user" },
    ]);

    expect(result).toEqual({
      providerId: "linuxdo",
      accountId: "linux_user",
      accessToken: undefined,
    });
  });

  it("picks Watcha when nothing else is available", () => {
    const result = pickLinkedAccount([
      { providerId: "watcha", accountId: "w_user" },
    ]);

    expect(result).toEqual({
      providerId: "watcha",
      accountId: "w_user",
      accessToken: undefined,
    });
  });

  it("returns null when no accounts are provided", () => {
    expect(pickLinkedAccount([])).toBeNull();
  });

  it("returns null when the account id is empty/whitespace", () => {
    const result = pickLinkedAccount([
      { providerId: "github", accountId: "  " },
    ]);

    expect(result).toBeNull();
  });

  it("includes the access token when available", () => {
    const result = pickLinkedAccount([
      { providerId: "github", accountId: "gh_user", accessToken: "tok123" },
    ]);

    expect(result).toEqual({
      providerId: "github",
      accountId: "gh_user",
      accessToken: "tok123",
    });
  });

  it("returns null when only unknown providers exist", () => {
    const result = pickLinkedAccount([
      { providerId: "twitter", accountId: "tw_user" },
    ]);

    expect(result).toBeNull();
  });
});
