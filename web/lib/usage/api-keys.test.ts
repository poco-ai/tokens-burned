import { describe, expect, it } from "vitest";

import {
  generateUsageApiKey,
  hashUsageApiKey,
  splitApiKeyPrefix,
} from "./api-keys";

describe("usage api keys", () => {
  it("generates ta_ prefixed keys", () => {
    const key = generateUsageApiKey();

    expect(key.raw.startsWith("ta_")).toBe(true);
    expect(key.prefix).toBe(key.raw.slice(0, 12));
  });

  it("hashes deterministically", () => {
    expect(hashUsageApiKey("ta_test")).toBe(hashUsageApiKey("ta_test"));
  });

  it("extracts the display prefix", () => {
    expect(splitApiKeyPrefix("ta_1234567890abcdef")).toBe("ta_12345678");
  });
});
