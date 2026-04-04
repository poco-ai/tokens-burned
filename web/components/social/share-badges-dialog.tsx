"use client";

import { AlertCircle, Check, Copy, Lock, Share2, XIcon } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ShareBadgesDialogProps = {
  username: string;
  publicProfileEnabled: boolean;
  appUrl: string;
};

type BadgeMetric = "streak" | "tokens" | "active_time" | "cost";
type BadgeStyle = "flat" | "flat-square" | "plastic" | "for-the-badge";

type CopyFeedback = { metric: BadgeMetric; kind: "success" | "error" } | null;

type BadgeDefinition = {
  metric: BadgeMetric;
  alt: string;
};

const badgeDefinitions: BadgeDefinition[] = [
  {
    metric: "streak",
    alt: "TokenArena streak badge",
  },
  {
    metric: "tokens",
    alt: "TokenArena tokens badge",
  },
  {
    metric: "active_time",
    alt: "TokenArena active time badge",
  },
  {
    metric: "cost",
    alt: "TokenArena cost badge",
  },
];

const badgeStyles: BadgeStyle[] = [
  "flat",
  "flat-square",
  "plastic",
  "for-the-badge",
];

function buildBadgeUrl(
  appUrl: string,
  username: string,
  metric: BadgeMetric,
  style: BadgeStyle,
) {
  const url = new URL(`/api/badges/${encodeURIComponent(username)}`, appUrl);
  url.searchParams.set("metric", metric);
  url.searchParams.set("style", style);
  return url.toString();
}

function buildMarkdown(url: string, alt: string) {
  return `![${alt}](${url})`;
}

export function ShareBadgesDialog({
  username,
  publicProfileEnabled,
  appUrl,
}: ShareBadgesDialogProps) {
  const t = useTranslations("usage.badges");
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null);
  const [selectedStyle, setSelectedStyle] = useState<BadgeStyle>("flat");

  const items = useMemo(
    () =>
      badgeDefinitions.map((definition) => {
        const url = buildBadgeUrl(
          appUrl,
          username,
          definition.metric,
          selectedStyle,
        );
        return {
          ...definition,
          url,
          markdown: buildMarkdown(url, definition.alt),
        };
      }),
    [appUrl, selectedStyle, username],
  );

  const copy = async (value: string, metric: BadgeMetric) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback({ metric, kind: "success" });
      window.setTimeout(() => setCopyFeedback(null), 1800);
    } catch {
      setCopyFeedback({ metric, kind: "error" });
      window.setTimeout(() => setCopyFeedback(null), 2200);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Share2 />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92vh] w-[min(96vw,52rem)] max-w-[52rem] flex-col border border-border/70 bg-card p-0 shadow-2xl"
      >
        <DialogHeader className="border-b border-border/60 px-6 pt-6 pb-4">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <DialogTitle className="min-w-0 truncate text-lg font-semibold leading-7">
              {t("title")}
            </DialogTitle>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 rounded-lg hover:bg-accent/60 transition-colors"
                aria-label="Close"
                title="Close"
              >
                <XIcon className="size-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto p-5">
          <div>
            <div className="grid w-full grid-cols-2 rounded-2xl border border-border/60 bg-muted/25 p-1 shadow-sm">
              {badgeStyles.map((style) => {
                const isActive = style === selectedStyle;

                return (
                  <button
                    key={style}
                    type="button"
                    className={cn(
                      "relative z-10 inline-flex min-w-0 items-center justify-center rounded-xl px-2 py-2 text-[10px] font-medium transition-colors sm:px-2.5 sm:text-xs",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setSelectedStyle(style)}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="badge-style-highlight"
                        className="absolute inset-0 rounded-xl border border-border/70 bg-background shadow-sm"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    ) : null}
                    <span className="relative whitespace-nowrap">
                      {t(`styles.${style}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {!publicProfileEnabled ? (
            <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 size-4 shrink-0" />
                <span>{t("privateHint")}</span>
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => {
              const success =
                copyFeedback?.metric === item.metric &&
                copyFeedback.kind === "success";
              const error =
                copyFeedback?.metric === item.metric &&
                copyFeedback.kind === "error";
              const label = success
                ? t("status.copiedMarkdown")
                : error
                  ? t("status.failed")
                  : t("actions.copyMarkdown");

              return (
                <div
                  key={item.metric}
                  className="rounded-2xl border border-border/60 bg-muted/8 px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-center">
                      {/* biome-ignore lint/performance/noImgElement: badge SVG preview is tiny and dynamic */}
                      <img
                        src={item.url}
                        alt={item.alt}
                        className={cn(
                          "w-auto max-w-full",
                          selectedStyle === "for-the-badge" ? "h-7" : "h-5",
                        )}
                        loading="lazy"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={cn(
                        "size-8 shrink-0 rounded-lg border-border/70 bg-background/70",
                        error &&
                          "border-destructive/55 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive dark:border-destructive/50 dark:bg-destructive/15",
                      )}
                      aria-label={label}
                      title={label}
                      onClick={() => copy(item.markdown, item.metric)}
                    >
                      {success ? (
                        <Check className="size-3.5" aria-hidden />
                      ) : error ? (
                        <AlertCircle className="size-3.5" aria-hidden />
                      ) : (
                        <Copy className="size-3.5" aria-hidden />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
