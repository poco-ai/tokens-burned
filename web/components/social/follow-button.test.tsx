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
        "social.tags": {
          selectLabel: "关系",
          none: "未分类",
          "options.coworker": "同事",
          "options.friend": "朋友",
          "options.peer": "同行",
          "options.inspiration": "灵感来源",
        },
        "social.errors": {
          followFailed: "关注失败",
          tagFailed: "标签更新失败",
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

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => (
    <div data-slot="select">{children}</div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div data-slot="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-slot="select-item" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <div data-slot="select-trigger" className={className}>
      {children}
    </div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-slot="select-value">{placeholder}</span>
  ),
}));

describe("FollowButton", () => {
  it("keeps the follow action and tag selector on one row", () => {
    const markup = renderToStaticMarkup(
      <FollowButton
        locale="zh-CN"
        username="alice"
        initialFollowing
        initialTag={null}
        isAuthenticated
        size="sm"
      />,
    );

    expect(markup).toContain('class="flex flex-col gap-2"');
    expect(markup).toContain('class="flex flex-nowrap items-center gap-2"');
    expect(markup).toContain(
      'data-slot="select-trigger" class="min-w-[132px] shrink-0 bg-background"',
    );
    expect(markup).not.toContain("space-y-2");
  });
});
