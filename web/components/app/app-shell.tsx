import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AppHeaderNav } from "@/components/app/header-nav";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/usage/account-menu";
import { Link } from "@/i18n/navigation";

type AppShellProps = {
  locale: string;
  viewer: {
    email: string;
    username?: string | null;
  } | null;
  children: ReactNode;
};

export async function AppShell({ locale, viewer, children }: AppShellProps) {
  const t = await getTranslations({ locale, namespace: "social.nav" });
  const navItems = viewer
    ? [
        { href: "/usage", label: t("dashboard"), match: "prefix" as const },
        { href: "/people", label: t("people") },
      ]
    : [{ href: "/people", label: t("people") }];

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b border-border/60 bg-background/95 supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-8 gap-y-2">
            <Link
              href={viewer ? "/usage" : "/"}
              className="inline-flex shrink-0 items-center text-lg font-semibold tracking-tight text-foreground sm:text-xl"
            >
              Tokens Burned
            </Link>
            <AppHeaderNav items={navItems} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <LanguageSwitcher
              authenticated={Boolean(viewer)}
              variant="compact"
            />
            <ThemeSwitcher authenticated={Boolean(viewer)} variant="compact" />

            {viewer ? (
              <AccountMenu email={viewer.email} username={viewer.username} />
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

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}
