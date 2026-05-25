import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { AchievementNotification } from "@/components/achievements/achievement-notification";
import { AppFooter } from "@/components/app/app-footer";
import { AppHeaderNav } from "@/components/app/header-nav";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/usage/account-menu";
import { UsernameAutoAdjustedToast } from "@/components/usage/username-auto-adjusted-toast";
import { Link } from "@/i18n/navigation";
import type { UsageShareCardData } from "@/lib/usage/share-card";
import { cn } from "@/lib/utils";

type AppShellProps = {
  locale: string;
  viewer: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    username?: string | null;
    usernameAutoAdjusted?: boolean | null;
  } | null;
  usageReportShareData?: UsageShareCardData | null;
  mainClassName?: string;
  children: ReactNode;
};

export async function AppShell({
  locale,
  viewer,
  usageReportShareData,
  mainClassName,
  children,
}: AppShellProps) {
  const t = await getTranslations({ locale, namespace: "social.nav" });
  const navItems = viewer
    ? [
        { href: "/usage", label: t("dashboard"), match: "prefix" as const },
        { href: "/achievements", label: t("achievements") },
        { href: "/leaderboard", label: t("leaderboard") },
        { href: "/people", label: t("people") },
      ]
    : [
        { href: "/leaderboard", label: t("leaderboard") },
        { href: "/people", label: t("people") },
      ];

  return (
    <main
      className={cn("flex min-h-screen flex-col bg-muted/30", mainClassName)}
    >
      {viewer?.username ? (
        <UsernameAutoAdjustedToast
          enabled={viewer.usernameAutoAdjusted ?? false}
          username={viewer.username}
        />
      ) : null}

      <header className="border-b border-border/60 bg-background/95 supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-8 gap-y-2">
            <Link
              href={viewer ? "/usage" : "/"}
              className="inline-flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl"
            >
              <Image
                src="/logo_dark.svg"
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 dark:hidden"
                priority
              />
              <Image
                src="/logo_white.svg"
                alt=""
                width={32}
                height={32}
                className="hidden size-8 shrink-0 dark:block"
                priority
              />
              Token Arena
            </Link>
            <AppHeaderNav items={navItems} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {viewer ? (
              <>
                <div className="flex items-center gap-2">
                  <Suspense fallback={null}>
                    <LanguageSwitcher authenticated variant="icon" />
                  </Suspense>
                  <ThemeSwitcher authenticated variant="icon" />
                  <AchievementNotification
                    usageReportShareData={usageReportShareData}
                  />
                </div>
                <AccountMenu
                  email={viewer.email}
                  name={viewer.name}
                  image={viewer.image}
                  username={viewer.username}
                />
              </>
            ) : (
              <>
                <Suspense fallback={null}>
                  <LanguageSwitcher variant="icon" />
                </Suspense>
                <ThemeSwitcher variant="icon" />
                <Button asChild type="button" variant="outline" size="sm">
                  <Link href="/login">{t("signIn")}</Link>
                </Button>
                <Button asChild type="button" size="sm">
                  <Link href="/register">{t("register")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 min-w-0 w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>

      <AppFooter />
    </main>
  );
}
