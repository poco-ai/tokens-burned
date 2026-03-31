"use client";

import {
  Bell,
  ChevronRight,
  Flame,
  Medal,
  Sparkles,
  Target,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "@/i18n/navigation";
import { formatAchievementProgress } from "@/lib/achievements/format";
import type { AchievementNotificationData } from "@/lib/achievements/types";
import { formatTokenCount } from "@/lib/usage/format";
import { AchievementBadge } from "./achievement-badge";

type FetchState =
  | { status: "idle" | "loading" }
  | { status: "error" }
  | { status: "success"; data: AchievementNotificationData };

export function AchievementNotification() {
  const locale = useLocale();
  const t = useTranslations("achievements.notification");
  const tItems = useTranslations("achievements.items");
  const tPersona = useTranslations("usage.share.personas");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FetchState>({ status: "idle" });

  useEffect(() => {
    if (!open || state.status === "success" || state.status === "loading") {
      return;
    }

    let isCancelled = false;
    setState({ status: "loading" });

    fetch("/api/achievements/summary", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load achievement summary");
        }

        const data = (await response.json()) as AchievementNotificationData;

        if (!isCancelled) {
          setState({ status: "success", data });
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setState({ status: "error" });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [open, state.status]);

  const summary = state.status === "success" ? state.data : null;
  const recentCount = summary?.recentUnlocks.length ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative rounded-full"
          aria-label={t("button")}
        >
          <Bell className="size-4" aria-hidden />
          {recentCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-white">
              {recentCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <PopoverHeader className="gap-1 border-b border-border/60 px-4 py-3">
          <PopoverTitle className="flex items-center gap-2 text-sm">
            <Medal className="size-4" />
            {t("title")}
          </PopoverTitle>
          <PopoverDescription>{t("description")}</PopoverDescription>
        </PopoverHeader>

        {state.status === "loading" || state.status === "idle" ? (
          <div className="space-y-3 px-4 py-4">
            {["s1", "s2", "s3"].map((key) => (
              <div
                key={key}
                className="h-16 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : state.status === "error" ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            {t("error")}
          </div>
        ) : summary ? (
          <div className="space-y-4 px-4 py-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-border/60 px-3 py-3 text-center">
                <div className="text-[11px] text-muted-foreground">
                  {t("score")}
                </div>
                <div className="mt-1 text-base font-semibold">
                  {formatTokenCount(summary.score, locale)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 px-3 py-3 text-center">
                <div className="text-[11px] text-muted-foreground">
                  {t("level")}
                </div>
                <div className="mt-1 text-base font-semibold">
                  Lv. {summary.level}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 px-3 py-3 text-center">
                <div className="text-[11px] text-muted-foreground">
                  {t("streak")}
                </div>
                <div className="mt-1 text-base font-semibold">
                  {summary.currentStreak}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5" />
                {t("persona")}
              </div>
              <div className="rounded-2xl border border-border/60 px-3 py-3 text-sm text-foreground">
                {summary.currentPersona
                  ? tPersona(`${summary.currentPersona}.title`)
                  : t("noPersona")}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Flame className="size-3.5" />
                {t("recentUnlocks")}
              </div>
              {summary.recentUnlocks.length > 0 ? (
                summary.recentUnlocks.map((achievement) => (
                  <div
                    key={achievement.code}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 px-3 py-3"
                  >
                    <AchievementBadge
                      iconKey={achievement.iconKey}
                      tier={achievement.tier}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {tItems(`${achievement.code}.title`)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        +{achievement.points} pts
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/60 px-3 py-3 text-sm text-muted-foreground">
                  {t("emptyRecent")}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Target className="size-3.5" />
                {t("nextTargets")}
              </div>
              {summary.nextTargets.length > 0 ? (
                summary.nextTargets.map((achievement) => (
                  <div
                    key={achievement.code}
                    className="space-y-1.5 rounded-2xl border border-border/60 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-sm font-medium text-foreground">
                        {tItems(`${achievement.code}.title`)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatAchievementProgress({
                          current: achievement.progress.current,
                          target: achievement.progress.target,
                          unit: achievement.progress.unit,
                          locale,
                        })}
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500"
                        style={{
                          width: `${Math.max(achievement.progress.ratio * 100, 6)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/60 px-3 py-3 text-sm text-muted-foreground">
                  {t("emptyNextTargets")}
                </div>
              )}
            </div>

            <Button asChild type="button" size="sm" className="w-full">
              <Link href="/achievements">
                {t("viewAll")}
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
