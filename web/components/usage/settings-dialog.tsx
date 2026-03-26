"use client";

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
  initialTimezone: string;
  initialProjectMode: ProjectMode;
  initialKeys: UsageKeyRecord[];
};

export function SettingsDialog({
  initialTimezone,
  initialProjectMode,
  initialKeys,
}: SettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-border/60 bg-background/80 shadow-xs"
        >
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden bg-background p-0 shadow-2xl sm:max-w-4xl">
        <DialogHeader className="border-b border-border/60 bg-muted/20 px-6 py-5">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage preferences and CLI API keys.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto bg-muted/15 p-4 sm:p-5">
          <div className="space-y-4">
            <SettingsPreferences
              initialTimezone={initialTimezone}
              initialProjectMode={initialProjectMode}
            />
            <KeyManager initialKeys={initialKeys} variant="dialog" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
