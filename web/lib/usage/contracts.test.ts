import { describe, expect, it } from "vitest";

import { ingestRequestSchema } from "./contracts";

describe("ingestRequestSchema", () => {
  it("requires schemaVersion and device metadata", () => {
    const result = ingestRequestSchema.safeParse({
      buckets: [],
      sessions: [],
    });

    expect(result.success).toBe(false);
  });
});
