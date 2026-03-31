import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FollowButton } from "./follow-button";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace: string) =>
    (key: string): string => {
      const translations: Record<string, Record<string, string>> = {
        "social.profile": {
          follow: "关注",
          followingAction: "已关注",
          followToLogin: "登录后关注",
        },
        "social.errors": {
          followFailed: "关注失败",
        },
      };

      return translations[namespace]?.[key] ?? key;
    },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("FollowButton", () => {
  it("renders follow button when not following", () => {
    const markup = renderToStaticMarkup(
      <FollowButton
        locale="zh-CN"
        username="alice"
        initialFollowing={false}
        isAuthenticated
      />,
    );

    expect(markup).toContain("关注");
    expect(markup).not.toContain("已关注");
  });

  it("renders following button variant when following", () => {
    const markup = renderToStaticMarkup(
      <FollowButton
        locale="zh-CN"
        username="alice"
        initialFollowing
        isAuthenticated
      />,
    );

    expect(markup).toContain("已关注");
    expect(markup).toContain('variant="secondary"');
  });

  it("shows login link when not authenticated", () => {
    const markup = renderToStaticMarkup(
      <FollowButton
        locale="zh-CN"
        username="alice"
        initialFollowing={false}
        isAuthenticated={false}
      />,
    );

    expect(markup).toContain("登录后关注");
    expect(markup).toContain('href="/login"');
  });

  it("returns null when isSelf", () => {
    const markup = renderToStaticMarkup(
      <FollowButton
        locale="zh-CN"
        username="alice"
        initialFollowing={false}
        isAuthenticated
        isSelf
      />,
    );

    expect(markup).toBe("");
  });

  it("returns null when cannot follow and not following", () => {
    const markup = renderToStaticMarkup(
      <FollowButton
        locale="zh-CN"
        username="alice"
        initialFollowing={false}
        isAuthenticated
        canFollow={false}
      />,
    );

    expect(markup).toBe("");
  });
});
