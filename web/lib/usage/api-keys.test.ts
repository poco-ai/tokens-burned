import { describe, expect, it } from "vitest";

import {
  generateUsageApiKey,
  hashUsageApiKey,
  splitApiKeyPrefix,
} from "./api-keys";

describe("usage api keys", () => {
  it("generates vbu_ prefixed keys", () => {
    const key = generateUsageApiKey();

    expect(key.raw.startsWith("vbu_")).toBe(true);
    expect(key.prefix).toBe(key.raw.slice(0, 12));
  });

  it("hashes deterministically", () => {
    expect(hashUsageApiKey("vbu_test")).toBe(hashUsageApiKey("vbu_test"));
  });

  it("extracts the display prefix", () => {
    expect(splitApiKeyPrefix("vbu_1234567890abcdef")).toBe("vbu_12345678");
  });
});
