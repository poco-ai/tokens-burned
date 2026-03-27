import { SettingsDialog } from "@/components/usage/settings-dialog";
import { listUsageApiKeys } from "@/lib/usage/api-keys";
import { getUsagePreference } from "@/lib/usage/preferences";

type AppHeaderSettingsProps = {
  userId: string;
};

export async function AppHeaderSettings({ userId }: AppHeaderSettingsProps) {
  const [preference, keys] = await Promise.all([
    getUsagePreference(userId),
    listUsageApiKeys(userId),
  ]);

  return (
    <SettingsDialog
      initialTimezone={preference.timezone}
      initialProjectMode={preference.projectMode}
      initialPublicProfileEnabled={preference.publicProfileEnabled}
      initialBio={preference.bio}
      initialKeys={keys.map((key) => ({
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        status: key.status,
        lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        createdAt: key.createdAt.toISOString(),
      }))}
      triggerVariant="icon"
    />
  );
}
