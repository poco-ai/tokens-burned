"use client";

import { toPng } from "html-to-image";
import {
  Copy,
  DollarSign,
  Download,
  FolderLock,
  Share2,
  Sparkles,
  UserRoundX,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type {
  UsageShareCardData,
  UsageShareCardTemplate,
} from "@/lib/usage/share-card";
import { cn } from "@/lib/utils";
import {
  buildUsageShareCardCaption,
  UsageShareCardPreview,
  type UsageShareCardPrivacy,
} from "./share-card-preview";

type UsageShareDialogProps = {
  data: UsageShareCardData;
};

type ShareStatus = "copiedText" | "copiedImage" | "downloaded" | "failed";

const templateOptions: UsageShareCardTemplate[] = ["summary", "persona"];

function TemplateButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-colors",
        active
          ? "border-foreground/60 bg-foreground/[0.06] shadow-sm"
          : "border-border bg-background hover:border-foreground/30 hover:bg-muted/40",
      )}
    >
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{description}</div>
    </button>
  );
}

function PrivacyToggle({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
        active
          ? "border-foreground/60 bg-foreground/[0.06] shadow-sm"
          : "border-border bg-background hover:border-foreground/30 hover:bg-muted/40",
      )}
    >
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}

async function renderShareCard(node: HTMLElement) {
  if ("fonts" in document) {
    await document.fonts.ready;
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  return toPng(node, {
    cacheBust: true,
    pixelRatio: 1,
    width: 1200,
    height: 900,
    canvasWidth: 1200,
    canvasHeight: 900,
    backgroundColor: "#09090b",
  });
}

export function UsageShareDialog({ data }: UsageShareDialogProps) {
  const locale = useLocale();
  const t = useTranslations("usage.share");
  const exportRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<UsageShareCardTemplate>("summary");
  const [privacy, setPrivacy] = useState<UsageShareCardPrivacy>({
    hideProjectNames: true,
    hideCost: true,
    hideUsername: false,
  });
  const [status, setStatus] = useState<ShareStatus | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const canCopyImage =
    typeof navigator !== "undefined" &&
    typeof ClipboardItem !== "undefined" &&
    typeof navigator.clipboard?.write === "function";

  const caption = useMemo(
    () =>
      buildUsageShareCardCaption({
        data,
        template,
        privacy,
        locale,
        t,
      }),
    [data, locale, privacy, t, template],
  );

  useEffect(() => {
    if (!status) {
      return;
    }

    const timeoutId = window.setTimeout(() => setStatus(null), 2400);

    return () => window.clearTimeout(timeoutId);
  }, [status]);

  const exportImage = async () => {
    if (!exportRef.current) {
      throw new Error("Share card is not ready");
    }

    return renderShareCard(exportRef.current);
  };

  const setPrivacyValue = (key: keyof UsageShareCardPrivacy) => {
    setPrivacy((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setStatus("copiedText");
    } catch {
      setStatus("failed");
    }
  };

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      const dataUrl = await exportImage();
      const link = document.createElement("a");
      const safeRange =
        data.range.preset === "custom" ? "custom" : data.range.preset;
      link.download = `tokens-burned-${template}-${safeRange}.png`;
      link.href = dataUrl;
      link.click();
      setStatus("downloaded");
    } catch {
      setStatus("failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    if (!canCopyImage) {
      return;
    }

    try {
      setIsExporting(true);
      const dataUrl = await exportImage();
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      setStatus("copiedImage");
    } catch {
      setStatus("failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Share2 />
            {t("button")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[92vh] max-w-[calc(100vw-1.5rem)] gap-0 overflow-hidden border border-border/70 bg-card p-0 shadow-2xl sm:max-w-6xl">
          <DialogHeader className="border-b border-border/60 px-6 py-5">
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 overflow-y-auto p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="text-sm font-medium">{t("templates")}</div>
                <div className="grid gap-3">
                  {templateOptions.map((value) => (
                    <TemplateButton
                      key={value}
                      active={template === value}
                      title={t(`templateOptions.${value}.label`)}
                      description={t(`templateOptions.${value}.description`)}
                      onClick={() => setTemplate(value)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">{t("privacy")}</div>
                <div className="grid gap-3">
                  <PrivacyToggle
                    active={privacy.hideProjectNames}
                    title={t("privacyOptions.hideProject.title")}
                    description={t("privacyOptions.hideProject.description")}
                    icon={<FolderLock className="size-4" />}
                    onClick={() => setPrivacyValue("hideProjectNames")}
                  />
                  <PrivacyToggle
                    active={privacy.hideCost}
                    title={t("privacyOptions.hideCost.title")}
                    description={t("privacyOptions.hideCost.description")}
                    icon={<DollarSign className="size-4" />}
                    onClick={() => setPrivacyValue("hideCost")}
                  />
                  <PrivacyToggle
                    active={privacy.hideUsername}
                    title={t("privacyOptions.hideUsername.title")}
                    description={t("privacyOptions.hideUsername.description")}
                    icon={<UserRoundX className="size-4" />}
                    onClick={() => setPrivacyValue("hideUsername")}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="size-4 text-muted-foreground" />
                  {t("sourceTitle")}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("sourceDescription")}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{t("preview")}</div>
                <Badge variant="outline" className="rounded-full">
                  4:3 · 1200×900
                </Badge>
              </div>
              <div className="overflow-hidden rounded-[28px] border border-border/60 bg-muted/20 p-4 shadow-sm">
                <UsageShareCardPreview
                  data={data}
                  template={template}
                  privacy={privacy}
                  locale={locale}
                  size="preview"
                  className="mx-auto"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="items-center gap-2 border-t border-border/60 bg-card p-4 sm:flex-row sm:justify-end">
            <p className="mr-auto text-sm text-muted-foreground">
              {status ? t(`status.${status}`) : t("footerHint")}
            </p>
            <Button type="button" variant="outline" onClick={handleCopyText}>
              <Copy />
              {t("actions.copyText")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canCopyImage || isExporting}
              title={!canCopyImage ? t("copyImageUnsupported") : undefined}
              onClick={handleCopyImage}
            >
              <Copy />
              {t("actions.copyImage")}
            </Button>
            <Button
              type="button"
              disabled={isExporting}
              onClick={handleDownload}
            >
              <Download />
              {t("actions.download")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        className="pointer-events-none fixed top-0 left-[-10000px] opacity-0"
        aria-hidden="true"
      >
        <div ref={exportRef}>
          <UsageShareCardPreview
            data={data}
            template={template}
            privacy={privacy}
            locale={locale}
            size="export"
          />
        </div>
      </div>
    </>
  );
}
