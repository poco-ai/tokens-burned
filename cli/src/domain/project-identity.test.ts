import { describe, expect, it } from "vitest";

import { toProjectIdentity } from "./project-identity";

describe("toProjectIdentity", () => {
  it("hashes projects in hashed mode", () => {
    const result = toProjectIdentity({
      project: "tokenarena",
      mode: "hashed",
      salt: "secret-salt",
    });

    expect(result.projectKey).toHaveLength(16);
    expect(result.projectLabel).toBe(
      `Project ${result.projectKey.slice(0, 6)}`,
    );
  });
});
