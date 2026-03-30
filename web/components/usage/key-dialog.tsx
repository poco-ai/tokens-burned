"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type KeyDialogProps = {
  mode: "create" | "rename";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  pending?: boolean;
  onSubmit: (name: string) => Promise<void> | void;
};

export function KeyDialog({
  mode,
  open,
  onOpenChange,
  initialName,
  pending = false,
  onSubmit,
}: KeyDialogProps) {
  const t = useTranslations("usage.keys.dialog");
  const [name, setName] = useState(initialName ?? "");

  useEffect(() => {
    if (open) {
      setName(initialName ?? "");
    }
  }, [initialName, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-border/70 bg-card shadow-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("createTitle") : t("renameTitle")}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? t("createDescription")
              : t("renameDescription")}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmit(name);
          }}
        >
          <div className="space-y-2">
            {mode === "rename" ? (
              <Label htmlFor="key-name">{t("name")}</Label>
            ) : null}
            <Input
              id="key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("placeholder")}
              aria-label={mode === "create" ? t("name") : undefined}
              className="border-border/60 bg-background hover:bg-muted/40"
            />
          </div>

          <DialogFooter className="border-border/60 bg-muted/60">
            <Button
              type="submit"
              variant="outline"
              className="border-border/60 bg-background hover:bg-muted/40"
              disabled={pending || name.trim().length === 0}
            >
              {pending
                ? t("saving")
                : mode === "create"
                  ? t("createKey")
                  : t("saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
