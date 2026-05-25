import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/app/app-shell";
import { SettingsBody } from "@/components/usage/settings-body";
import { auth } from "@/lib/auth";
import { getEnabledLoginProviders } from "@/lib/auth-providers";
import { getSessionOrRedirect } from "@/lib/session";
import { listUsageApiKeys } from "@/lib/usage/api-keys";
import { getUsagePreference } from "@/lib/usage/preferences";
import { parseSettingsSectionParam } from "@/lib/usage/settings-routes";

type SettingsSectionPageProps = {
  params: Promise<{ locale: string; section: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}): Promise<Metadata> {
  const { locale, section } = await params;
  const t = await getTranslations({ locale, namespace: "usage" });
  const parsed = parseSettingsSectionParam(section);

  if (!parsed) {
    return { title: `${t("settings.title")} | Token Arena` };
  }

  const sectionTitle =
    parsed === "account"
      ? t("settings.navAccount")
      : parsed === "preferences"
        ? t("settings.navPreferences")
        : parsed === "authentication"
          ? t("settings.navAuthentication")
          : t("settings.navCliKeys");

  return {
    title: `${sectionTitle} · ${t("settings.title")} | Token Arena`,
  };
}

export default async function SettingsSectionPage({
  params,
}: SettingsSectionPageProps) {
  const { locale, section: sectionParam } = await params;
  const parsedSection = parseSettingsSectionParam(sectionParam);

  if (!parsedSection) {
    notFound();
  }

  const [session, requestHeaders] = await Promise.all([
    getSessionOrRedirect(locale),
    headers(),
  ]);
  const [preference, keys, accounts] = await Promise.all([
    getUsagePreference(session.user.id),
    listUsageApiKeys(session.user.id),
    auth.api.listUserAccounts({ headers: requestHeaders }),
  ]);

  const settingsProps = {
    initialName: session.user.name,
    initialUsername: session.user.username,
    requireUsernameSetup: session.user.usernameNeedsSetup ?? false,
    initialTimezone: preference.timezone,
    initialProjectMode: preference.projectMode,
    initialPublicProfileEnabled: preference.publicProfileEnabled,
    initialBio: preference.bio,
    initialKeys: keys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      status: key.status,
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
      createdAt: key.createdAt.toISOString(),
    })),
    connectedAccounts: accounts.map((account) => ({
      id: account.id,
      providerId: account.providerId,
      accountId: account.accountId,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
      scopes: account.scopes,
    })),
    availableProviders: getEnabledLoginProviders(),
  } as const;

  return (
    <AppShell
      locale={locale}
      viewer={{
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        username: session.user.username,
        usernameAutoAdjusted: session.user.usernameAutoAdjusted,
      }}
    >
      <SettingsBody
        {...settingsProps}
        keyManagerVariant="page"
        initialSection={parsedSection}
        navigateWithUrl
        viewer={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image ?? null,
          username: session.user.username ?? null,
        }}
      />
    </AppShell>
  );
}
