import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProfileListItem } from "./profile-list-item";

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

vi.mock("./follow-button", () => ({
  FollowButton: ({ initialTag }: { initialTag?: string | null }) => (
    <div data-testid="follow-button" data-initial-tag={initialTag ?? "none"} />
  ),
}));

describe("ProfileListItem", () => {
  it("renders the name with the username inline while keeping the card full width", () => {
    const markup = renderToStaticMarkup(
      <ProfileListItem
        locale="zh-CN"
        isAuthenticated
        profile={{
          id: "user_123",
          username: "qychen",
          name: "qychen",
          image: null,
          bio: null,
          followerCount: 0,
          followingCount: 0,
          isFollowing: false,
          followTag: null,
          followsYou: false,
          isSelf: true,
          publicProfileEnabled: true,
        }}
        labels={{
          followers: "粉丝",
          following: "关注",
          mutual: "互相关注",
          private: "私密",
          you: "你",
          tagNone: "未分组",
          tagCoworker: "同事",
          tagFriend: "朋友",
          tagPeer: "同行",
          tagInspiration: "灵感",
        }}
      />,
    );

    expect(markup).not.toContain("max-w-4xl");
    expect(markup).toContain("flex min-w-0 items-center gap-2 overflow-hidden");
    expect(markup).toMatch(
      />qychen<\/a><span class="shrink-0 text-sm text-muted-foreground">@qychen<\/span>/,
    );
    expect(markup).not.toContain(
      '<div class="text-sm text-muted-foreground">@qychen</div>',
    );
  });

  it("keeps the action area on a single row", () => {
    const markup = renderToStaticMarkup(
      <ProfileListItem
        locale="zh-CN"
        isAuthenticated
        profile={{
          id: "user_456",
          username: "alice",
          name: "Alice",
          image: null,
          bio: null,
          followerCount: 12,
          followingCount: 8,
          isFollowing: true,
          followTag: "coworker",
          followsYou: false,
          isSelf: false,
          publicProfileEnabled: true,
        }}
        labels={{
          followers: "粉丝",
          following: "关注",
          mutual: "互相关注",
          private: "私密",
          you: "你",
          tagNone: "未分组",
          tagCoworker: "同事",
          tagFriend: "朋友",
          tagPeer: "同行",
          tagInspiration: "灵感",
        }}
      />,
    );

    expect(markup).toContain("flex shrink-0 flex-nowrap items-center gap-2");
    expect(markup).not.toContain("flex shrink-0 flex-wrap items-center gap-2");
    expect(markup).not.toContain("flex shrink-0 flex-nowrap items-start gap-2");
    expect(markup).toContain('data-initial-tag="coworker"');
  });
});
