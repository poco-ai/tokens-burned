"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ProjectMode } from "@/lib/usage/types";
import { KeyManager, type UsageKeyRecord } from "./key-manager";
import { SettingsPreferences } from "./settings-preferences";

type SettingsDialogProps = {
  initialLocale: string;
  initialTheme: string;
  initialTimezone: string;
  initialProjectMode: ProjectMode;
  initialPublicProfileEnabled: boolean;
  initialBio: string | null;
  initialKeys: UsageKeyRecord[];
};

export function SettingsDialog({
  initialLocale,
  initialTheme,
  initialTimezone,
  initialProjectMode,
  initialPublicProfileEnabled,
  initialBio,
  initialKeys,
}: SettingsDialogProps) {
  const t = useTranslations("usage.settings");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-border/60 bg-background/80 shadow-xs"
        >
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden bg-background p-0 shadow-2xl sm:max-w-4xl">
        <DialogHeader className="border-b border-border/60 bg-muted/20 px-6 py-5">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto bg-muted/15 p-4 sm:p-5">
          <div className="space-y-4">
            <SettingsPreferences
              initialLocale={initialLocale}
              initialTheme={initialTheme}
              initialTimezone={initialTimezone}
              initialProjectMode={initialProjectMode}
              initialPublicProfileEnabled={initialPublicProfileEnabled}
              initialBio={initialBio}
            />
            <KeyManager initialKeys={initialKeys} variant="dialog" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
