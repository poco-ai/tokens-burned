import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LeaderboardTable } from "./leaderboard-table";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    className,
    href,
  }: {
    children: ReactNode;
    className?: string;
    href: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("LeaderboardTable", () => {
  it("renders leaderboard rows with ranks and profile links", () => {
    const markup = renderToStaticMarkup(
      <LeaderboardTable
        locale="en"
        title="Global leaderboard"
        emptyLabel="Empty"
        entries={[
          {
            rank: 1,
            userId: "user_1",
            name: "Ada",
            username: "ada",
            image: null,
            bio: "Building with Codex",
            estimatedCostUsd: 12.34,
            totalTokens: 152340,
            inputTokens: 60000,
            outputTokens: 80000,
            reasoningTokens: 10000,
            cachedTokens: 12340,
            activeSeconds: 5400,
            sessions: 18,
            followerCount: 42,
            followingCount: 7,
            isSelf: true,
            isFollowing: false,
            followsYou: false,
          },
        ]}
        labels={{
          rank: "Rank",
          user: "User",
          totalTokens: "Total Tokens",
          estimatedCost: "Est. Cost",
          activeTime: "Active Time",
          sessions: "Sessions",
          followers: "Followers",
          mutual: "Mutual",
          you: "You",
        }}
      />,
    );

    expect(markup).toContain("#1");
    expect(markup).toContain('href="/u/ada"');
    expect(markup).toContain("Ada");
    expect(markup).toContain("@ada");
    expect(markup).toContain("You");
    expect(markup).toContain("Est. Cost");
    expect(markup).toContain("$12.34");
  });
});
