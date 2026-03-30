import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { getOptionalSession } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.register" });

  return {
    title: `${t("title")} | Token Arena`,
    description: t("description"),
  };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getOptionalSession();
  const t = await getTranslations("auth.register");

  if (session) {
    redirect(`/${locale}/usage`);
  }

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
      <RegisterForm />
    </AuthShell>
  );
}
