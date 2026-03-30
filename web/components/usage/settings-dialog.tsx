"use client";

import { Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { LoginProvider } from "@/lib/auth-providers";
import type { ProjectMode } from "@/lib/usage/types";
import type { UsageKeyRecord } from "./key-manager";
import { SettingsBody } from "./settings-body";

type SettingsDialogProps = {
  initialName?: string;
  initialUsername?: string;
  requireUsernameSetup?: boolean;
  initialTimezone: string;
  initialProjectMode: ProjectMode;
  initialPublicProfileEnabled: boolean;
  initialBio: string | null;
  initialKeys: UsageKeyRecord[];
  connectedAccounts?: Array<{
    id: string;
    providerId: string;
    accountId: string;
    createdAt: string;
    updatedAt: string;
    scopes: string[];
  }>;
  availableProviders?: LoginProvider[];
  triggerVariant?: "button" | "icon";
  triggerLabel?: ReactNode;
  triggerButtonVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerButtonSize?: "default" | "sm";
  triggerClassName?: string;
};

export function SettingsDialog({
  initialName = "",
  initialUsername = "",
  requireUsernameSetup = false,
  initialTimezone,
  initialProjectMode,
  initialPublicProfileEnabled,
  initialBio,
  initialKeys,
  connectedAccounts = [],
  availableProviders = [],
  triggerVariant = "button",
  triggerLabel,
  triggerButtonVariant = "outline",
  triggerButtonSize = "sm",
  triggerClassName,
}: SettingsDialogProps) {
  const t = useTranslations("usage.settings");
  const resolvedTriggerLabel = triggerLabel ?? t("button");

  return (
    <Dialog>
      <DialogTrigger asChild>
        {triggerVariant === "icon" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={triggerClassName}
            aria-label={
              typeof resolvedTriggerLabel === "string"
                ? resolvedTriggerLabel
                : t("button")
            }
            title={
              typeof resolvedTriggerLabel === "string"
                ? resolvedTriggerLabel
                : t("button")
            }
          >
            <Settings2 className="size-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            variant={triggerButtonVariant}
            size={triggerButtonSize}
            className={triggerClassName}
          >
            {resolvedTriggerLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden border border-border/70 bg-card p-0 shadow-2xl sm:max-w-4xl">
        <DialogHeader className="border-b border-border/60 bg-card px-6 py-5">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto bg-muted p-4 sm:p-5">
          <SettingsBody
            initialName={initialName}
            initialUsername={initialUsername}
            requireUsernameSetup={requireUsernameSetup}
            initialTimezone={initialTimezone}
            initialProjectMode={initialProjectMode}
            initialPublicProfileEnabled={initialPublicProfileEnabled}
            initialBio={initialBio}
            initialKeys={initialKeys}
            connectedAccounts={connectedAccounts}
            availableProviders={availableProviders}
            keyManagerVariant="dialog"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
