import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginDitherBackground } from "@/components/auth/login-dither-background";
import { LoginForm } from "@/components/auth/login-form";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { Link } from "@/i18n/navigation";
import { getAuthenticatedAppPath } from "@/lib/account-setup";
import { authMode, isSelfHosted } from "@/lib/auth-config";
import { getEnabledLoginProviders } from "@/lib/auth-providers";
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
  const description = isSelfHosted ? t("description") : t("oauthDescription");

  return {
    title: `${t("title")} | Token Arena`,
    description,
  };
}

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { locale } = await params;
  const session = await getOptionalSession();
  const t = await getTranslations("auth.login");
  const providers = getEnabledLoginProviders();

  if (session) {
    redirect(getAuthenticatedAppPath(locale, session.user));
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const showInvalidSessionMessage = resolvedSearchParams?.invalid === "1";
  const description = isSelfHosted ? t("description") : t("oauthDescription");

  return (
    <div className="dark min-h-screen-ios">
      <AuthShell
        background={<LoginDitherBackground />}
        title={t("title")}
        description={description}
        titleVariant="hero"
        cardFooter={
          providers.length > 0 ? (
            <p className="text-center text-sm text-white/80">
              {t("agreementPrefix")}{" "}
              <Link
                href="/legal/terms"
                className="underline underline-offset-4"
              >
                {t("termsLink")}
              </Link>{" "}
              {t("and")}{" "}
              <Link
                href="/legal/privacy"
                className="underline underline-offset-4"
              >
                {t("privacyLink")}
              </Link>
            </p>
          ) : null
        }
        footerActions={
          <>
            <LanguageSwitcher footerIcon variant="icon" />
            <ThemeSwitcher footerIcon variant="icon" />
          </>
        }
      >
        <LoginForm
          mode={authMode}
          showInvalidSessionMessage={showInvalidSessionMessage}
          providers={providers}
        />
      </AuthShell>
    </div>
  );
}
