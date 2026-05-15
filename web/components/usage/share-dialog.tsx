"use client";

import { AlertCircle, Check, Copy, Download, Share2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import type { UsageShareCardPrivacy } from "./share-card-preview";

type UsageShareDialogProps = {
  data: UsageShareCardData;
  defaultTemplate?: UsageShareCardTemplate;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode | null;
};

type ShareStatus = "copiedImage" | "downloaded" | "failed";

type ShareFooterAction = "copy" | "download";
type ShareActionState = "idle" | "success" | "error";

const defaultPrivacy: UsageShareCardPrivacy = {
  hideProjectNames: true,
  hideCost: false,
  hideUsername: false,
};

const UsageShareCardPreviewLoader = dynamic(
  () =>
    import("./share-card-preview-loader").then(
      (mod) => mod.UsageShareCardPreviewLoader,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[4/3] w-full max-w-[760px] animate-pulse rounded-[2rem] bg-muted" />
    ),
  },
);

async function renderShareCard(node: HTMLElement) {
  const { toPng } = await import("html-to-image");

  if ("fonts" in document) {
    await document.fonts.ready;
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const rect = node.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(Math.max(node.scrollWidth, rect.width)));
  const height = Math.max(
    1,
    Math.ceil(Math.max(node.scrollHeight, rect.height)),
  );
  const pixelRatio =
    typeof window !== "undefined" && window.devicePixelRatio
      ? Math.min(window.devicePixelRatio, 3)
      : 2;

  return toPng(node, {
    cacheBust: true,
    pixelRatio,
    width,
    height,
    canvasWidth: Math.ceil(width * pixelRatio),
    canvasHeight: Math.ceil(height * pixelRatio),
    backgroundColor: "#09090b",
  });
}

function ShareActionButton({
  actionState,
  disabled,
  icon,
  label,
  onClick,
  title,
  variant,
}: {
  actionState: ShareActionState;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  title?: string;
  variant?: "default" | "outline";
}) {
  const stateIcon =
    actionState === "success" ? (
      <Check className="size-4 shrink-0 text-foreground" aria-hidden />
    ) : actionState === "error" ? (
      <AlertCircle className="size-4 shrink-0" aria-hidden />
    ) : (
      icon
    );

  return (
    <Button
      type="button"
      variant={variant}
      className={cn(
        "flex h-8 max-w-full min-w-0 justify-center gap-1.5 overflow-hidden whitespace-normal sm:min-h-8",
        actionState === "success" &&
          "border-border bg-muted text-foreground dark:border-border dark:bg-muted dark:text-foreground",
        actionState === "error" &&
          "border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive/45 dark:bg-destructive/15 dark:text-destructive",
      )}
      disabled={disabled}
      title={title}
      aria-label={label}
      onClick={onClick}
    >
      {stateIcon}
      {actionState === "idle" ? (
        <span className="min-w-0 truncate">{label}</span>
      ) : null}
    </Button>
  );
}

export function UsageShareDialog({
  data,
  defaultTemplate = "receipt",
  open,
  onOpenChange,
  trigger,
}: UsageShareDialogProps) {
  const locale = useLocale();
  const t = useTranslations("usage.share");
  const exportRef = useRef<HTMLDivElement>(null);
  const template = defaultTemplate;
  const [status, setStatus] = useState<ShareStatus | null>(null);
  const [lastAction, setLastAction] = useState<ShareFooterAction | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewReady, setIsPreviewReady] = useState(false);

  const handlePreviewReady = useCallback(() => {
    setIsPreviewReady(true);
  }, []);

  const canCopyImage =
    typeof navigator !== "undefined" &&
    typeof ClipboardItem !== "undefined" &&
    typeof navigator.clipboard?.write === "function";

  useEffect(() => {
    if (!status) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStatus(null);
      setLastAction(null);
    }, 2400);

    return () => window.clearTimeout(timeoutId);
  }, [status]);

  const exportImage = async () => {
    if (!exportRef.current) {
      throw new Error("Share card is not ready");
    }

    return renderShareCard(exportRef.current);
  };

  const handleDownload = async () => {
    setLastAction("download");
    try {
      setIsExporting(true);
      const dataUrl = await exportImage();
      const link = document.createElement("a");
      const safeRange =
        data.range.preset === "custom" ? "custom" : data.range.preset;
      link.download = `tokenarena-${template}-${safeRange}.png`;
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

    setLastAction("copy");
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

  const copyState: ShareActionState =
    lastAction !== "copy"
      ? "idle"
      : status === "copiedImage"
        ? "success"
        : status === "failed"
          ? "error"
          : "idle";
  const downloadState: ShareActionState =
    lastAction !== "download"
      ? "idle"
      : status === "downloaded"
        ? "success"
        : status === "failed"
          ? "error"
          : "idle";

  const resetState = () => {
    setStatus(null);
    setLastAction(null);
    setIsPreviewReady(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetState();
        }
        onOpenChange?.(nextOpen);
      }}
    >
      {trigger === undefined ? (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Share2 />
            {t("button")}
          </Button>
        </DialogTrigger>
      ) : trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : null}
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          "!flex min-h-0 w-[min(96vw,56rem)] max-w-none flex-col gap-0 overflow-hidden border border-border/70 bg-card p-0 shadow-2xl",
          "h-[min(46rem,90svh)] !max-h-[min(46rem,90svh)]",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4 sm:px-6">
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden p-4 sm:p-5">
          <div className="min-h-0 min-w-0 flex-1 basis-0 overflow-y-auto overscroll-contain p-2 sm:p-3 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
            <UsageShareCardPreviewLoader
              data={data}
              template={template}
              privacy={defaultPrivacy}
              locale={locale}
              size="preview"
              className="mx-auto w-full !max-w-[min(34rem,76svh)]"
              onReady={handlePreviewReady}
            />
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-x-hidden border-t border-border/60 bg-card p-3 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-end sm:gap-2 sm:p-4">
          <div className="grid min-w-0 w-full grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-2">
            <ShareActionButton
              variant="outline"
              actionState={copyState}
              disabled={!canCopyImage || isExporting || !isPreviewReady}
              title={!canCopyImage ? t("copyImageUnsupported") : undefined}
              icon={<Copy className="size-4 shrink-0" aria-hidden />}
              label={t("actions.copyImage")}
              onClick={handleCopyImage}
            />
            <ShareActionButton
              actionState={downloadState}
              disabled={isExporting || !isPreviewReady}
              icon={<Download className="size-4 shrink-0" aria-hidden />}
              label={t("actions.download")}
              onClick={handleDownload}
            />
          </div>
        </DialogFooter>

        <div
          className="pointer-events-none fixed top-0 left-0 h-px w-px overflow-hidden opacity-0"
          aria-hidden="true"
        >
          <div ref={exportRef} className="receipt-export-surface inline-block">
            <UsageShareCardPreviewLoader
              data={data}
              template={template}
              privacy={defaultPrivacy}
              locale={locale}
              size="export"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
