"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { emitPreferenceSavedNotice } from "@/lib/usage/preference-notice";
import { cn } from "@/lib/utils";

type LeaderboardPublicProfileButtonProps = {
  className?: string;
};

export function LeaderboardPublicProfileButton({
  className,
}: LeaderboardPublicProfileButtonProps) {
  const t = useTranslations("social.leaderboard");
  const tSettings = useTranslations("usage.settings");
  const { refresh } = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enablePublicProfile() {
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/usage/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicProfileEnabled: true }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : tSettings("saveFailed"),
        );
      }

      emitPreferenceSavedNotice({
        timezone: payload.timezone,
        projectMode: payload.projectMode,
        publicProfileEnabled: payload.publicProfileEnabled,
        bio: payload.bio,
      });
      refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : tSettings("saveFailed"),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0"
        disabled={pending}
        aria-busy={pending}
        onClick={() => void enablePublicProfile()}
      >
        {pending ? (
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        ) : null}
        {t("enablePublicProfile")}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
