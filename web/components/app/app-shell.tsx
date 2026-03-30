import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AppFooter } from "@/components/app/app-footer";
import { AppHeaderNav } from "@/components/app/header-nav";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/usage/account-menu";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type AppShellProps = {
  locale: string;
  viewer: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    username?: string | null;
  } | null;
  mainClassName?: string;
  children: ReactNode;
};

export async function AppShell({
  locale,
  viewer,
  mainClassName,
  children,
}: AppShellProps) {
  const t = await getTranslations({ locale, namespace: "social.nav" });
  const navItems = viewer
    ? [
        { href: "/usage", label: t("dashboard"), match: "prefix" as const },
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
      <header className="border-b border-border/60 bg-background/95 supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-8 gap-y-2">
            <Link
              href={viewer ? "/usage" : "/"}
              className="inline-flex shrink-0 items-center text-lg font-semibold tracking-tight text-foreground sm:text-xl"
            >
              Token Arena
            </Link>
            <AppHeaderNav items={navItems} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {viewer ? (
              <AccountMenu
                email={viewer.email}
                name={viewer.name}
                image={viewer.image}
                username={viewer.username}
              />
            ) : (
              <>
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

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>

      <AppFooter
        actions={
          <>
            <LanguageSwitcher
              authenticated={Boolean(viewer)}
              footerIcon
              variant="icon"
            />
            <ThemeSwitcher
              authenticated={Boolean(viewer)}
              footerIcon
              variant="icon"
            />
          </>
        }
      />
    </main>
  );
}
