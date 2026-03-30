"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";
import { emitPreferenceSavedNotice } from "@/lib/usage/preference-notice";

export function LeaderboardPrivateNotice() {
  const t = useTranslations("social.leaderboard");
  const tSettings = useTranslations("usage.settings");
  const router = useRouter();
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
      router.refresh();
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
    <Card className="border-dashed shadow-sm ring-1 ring-border/60">
      <CardContent className="flex flex-col gap-3 py-4">
        {error ? (
          <Alert variant="destructive" className="border-destructive/20">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="text-sm font-medium">{t("privateNoticeTitle")}</div>
            <p className="text-sm text-muted-foreground">
              {t("privateNoticeDescription")}
            </p>
          </div>
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
        </div>
      </CardContent>
    </Card>
  );
}
