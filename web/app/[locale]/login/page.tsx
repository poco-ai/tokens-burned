import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { getOptionalSession } from "@/lib/session";

type LoginPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    invalid?: string;
  }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.login" });

  return {
    title: `${t("title")} | Token Arena`,
    description: t("description"),
  };
}

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { locale } = await params;
  const session = await getOptionalSession();
  const t = await getTranslations("auth.login");

  if (session) {
    redirect(`/${locale}/usage`);
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const showInvalidSessionMessage = resolvedSearchParams?.invalid === "1";

  return (
    <AuthShell
      title={t("title")}
      description={t("description")}
      headerActions={
        <>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </>
      }
    >
      <LoginForm showInvalidSessionMessage={showInvalidSessionMessage} />
    </AuthShell>
  );
}
