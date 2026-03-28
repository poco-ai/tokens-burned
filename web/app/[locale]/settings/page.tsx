import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/app/app-shell";
import { SettingsBody } from "@/components/usage/settings-body";
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
    title: `${t("settings.title")} | Tokens Burned`,
  };
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  const session = await getSessionOrRedirect(locale);
  const [preference, keys] = await Promise.all([
    getUsagePreference(session.user.id),
    listUsageApiKeys(session.user.id),
  ]);

  const settingsProps = {
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
