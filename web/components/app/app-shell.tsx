import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
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

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b border-border/60 bg-background/95">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href={viewer ? "/usage" : "/"}
            className="mr-auto text-sm font-semibold tracking-tight text-foreground"
          >
            Tokens Burned
          </Link>

          <Button asChild type="button" variant="outline" size="sm">
            <Link href="/people">{t("people")}</Link>
          </Button>

          {viewer?.username ? (
            <Button asChild type="button" variant="outline" size="sm">
              <Link href={`/u/${viewer.username}`}>{t("profile")}</Link>
            </Button>
          ) : null}

          {viewer ? (
            <Button asChild type="button" variant="outline" size="sm">
              <Link href="/usage">{t("dashboard")}</Link>
            </Button>
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

          <LanguageSwitcher authenticated={Boolean(viewer)} />
          <ThemeSwitcher authenticated={Boolean(viewer)} />

          {viewer ? (
            <AccountMenu email={viewer.email} username={viewer.username} />
          ) : null}
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}
