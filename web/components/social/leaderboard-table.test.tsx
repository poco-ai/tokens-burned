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

    expect(markup).toContain("🥇");
    expect(markup).toContain('href="/u/ada"');
    expect(markup).toContain("Ada");
    expect(markup).toContain("@ada");
    expect(markup).toContain("You");
    expect(markup).toContain("Est. Cost");
    expect(markup).toContain("$12.34");
    expect(markup).toContain("🥇");
    expect(markup).toContain("bg-amber-50/80");
  });

  it("highlights the top 3 ranks", () => {
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
            isSelf: false,
            isFollowing: false,
            followsYou: false,
          },
          {
            rank: 2,
            userId: "user_2",
            name: "Grace",
            username: "grace",
            image: null,
            bio: "Still shipping",
            estimatedCostUsd: 10.21,
            totalTokens: 142000,
            inputTokens: 55000,
            outputTokens: 75000,
            reasoningTokens: 8000,
            cachedTokens: 4000,
            activeSeconds: 5000,
            sessions: 15,
            followerCount: 38,
            followingCount: 11,
            isSelf: false,
            isFollowing: false,
            followsYou: false,
          },
          {
            rank: 3,
            userId: "user_3",
            name: "Linus",
            username: "linus",
            image: null,
            bio: "Exploring",
            estimatedCostUsd: 9.9,
            totalTokens: 130000,
            inputTokens: 50000,
            outputTokens: 70000,
            reasoningTokens: 7000,
            cachedTokens: 3000,
            activeSeconds: 4700,
            sessions: 12,
            followerCount: 31,
            followingCount: 8,
            isSelf: false,
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

    expect(markup).toContain("🥇");
    expect(markup).toContain("🥈");
    expect(markup).toContain("🥉");
    expect(markup).toContain("bg-amber-50/80");
    expect(markup).toContain("bg-slate-100/80");
    expect(markup).toContain("bg-orange-100/70");
  });

  it("renders a pinned viewer row below the main leaderboard entries", () => {
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
            isSelf: false,
            isFollowing: false,
            followsYou: false,
          },
        ]}
        viewerEntry={{
          rank: 57,
          userId: "viewer_1",
          name: "Linus",
          username: "linus",
          image: null,
          bio: "Still climbing",
          estimatedCostUsd: 1.23,
          totalTokens: 1234,
          inputTokens: 600,
          outputTokens: 500,
          reasoningTokens: 100,
          cachedTokens: 34,
          activeSeconds: 300,
          sessions: 2,
          followerCount: 3,
          followingCount: 1,
          isSelf: true,
          isFollowing: false,
          followsYou: false,
        }}
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

    expect(markup).toContain("#57");
    expect(markup).toContain('href="/u/linus"');
    expect(markup).toContain("@linus");
    expect(markup).toContain("...");
  });

  it("renders a private viewer notice row when the viewer cannot be ranked", () => {
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
            isSelf: false,
            isFollowing: false,
            followsYou: false,
          },
        ]}
        viewerNotice={{
          name: "Private User",
          username: "private.user",
          message: "Profile is private and cannot be ranked.",
        }}
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

    expect(markup).toContain('href="/u/private.user"');
    expect(markup).toContain("@private.user");
    expect(markup).toContain("Profile is private and cannot be ranked.");
    expect(markup).toContain(">You<");
  });
});
