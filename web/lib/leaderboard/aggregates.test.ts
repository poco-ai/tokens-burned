import { describe, expect, it } from "vitest";
import { collectAffectedLeaderboardDates } from "./aggregates";

describe("collectAffectedLeaderboardDates", () => {
  it("deduplicates and sorts bucket, session, and previous session dates", () => {
    const dates = collectAffectedLeaderboardDates({
      bucketStarts: ["2026-03-28T02:00:00.000Z", "2026-03-28T18:00:00.000Z"],
      sessionStarts: ["2026-03-29T01:00:00.000Z"],
      existingSessionStarts: ["2026-03-27T23:59:59.000Z"],
    });

    expect(dates.map((value) => value.toISOString())).toEqual([
      "2026-03-27T00:00:00.000Z",
      "2026-03-28T00:00:00.000Z",
      "2026-03-29T00:00:00.000Z",
    ]);
  });
});
