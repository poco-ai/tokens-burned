import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/app/app-shell";
import { SettingsBody } from "@/components/usage/settings-body";
import { auth } from "@/lib/auth";
import { getEnabledLoginProviders } from "@/lib/auth-providers";
import { getSessionOrRedirect } from "@/lib/session";
import { listUsageApiKeys } from "@/lib/usage/api-keys";
import { getUsagePreference } from "@/lib/usage/preferences";

type SettingsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "usage" });

  return {
    title: `${t("settings.title")} | Token Arena`,
  };
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  const session = await getSessionOrRedirect(locale);
  const requestHeaders = await headers();
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
        username: session.user.username,
      }}
    >
      <SettingsBody {...settingsProps} keyManagerVariant="page" />
    </AppShell>
  );
}
