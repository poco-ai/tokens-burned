import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveLinkedProfileUrl } from "./linked-provider-profile";

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
});
