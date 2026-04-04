"use client";

import { AlertCircle, Check, Copy, Lock, Share2, XIcon } from "lucide-react";
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

function buildBadgeUrl(appUrl: string, username: string, metric: BadgeMetric) {
  return `${appUrl}/api/badges/${encodeURIComponent(username)}?metric=${metric}`;
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

  const items = useMemo(
    () =>
      badgeDefinitions.map((definition) => {
        const url = buildBadgeUrl(appUrl, username, definition.metric);
        return {
          ...definition,
          url,
          markdown: buildMarkdown(url, definition.alt),
        };
      }),
    [appUrl, username],
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
        className="flex max-h-[92vh] max-w-2xl flex-col border border-border/70 bg-card p-0 shadow-2xl"
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
          {!publicProfileEnabled ? (
            <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 size-4 shrink-0" />
                <span>{t("privateHint")}</span>
              </div>
            </div>
          ) : null}
          <div className="grid gap-3">
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
                        className="h-8 max-w-full"
                        loading="lazy"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={cn(
                        "size-9 shrink-0 rounded-xl border-border/70 bg-background/70",
                        error &&
                          "border-destructive/55 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive dark:border-destructive/50 dark:bg-destructive/15",
                      )}
                      aria-label={label}
                      title={label}
                      onClick={() => copy(item.markdown, item.metric)}
                    >
                      {success ? (
                        <Check className="size-4" aria-hidden />
                      ) : error ? (
                        <AlertCircle className="size-4" aria-hidden />
                      ) : (
                        <Copy className="size-4" aria-hidden />
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
