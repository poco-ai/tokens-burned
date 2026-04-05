import { getTranslations } from "next-intl/server";
import { getArenaLevelProgressFromScore } from "@/lib/achievements/arena-level";
import { formatTokenCount } from "@/lib/usage/format";
import { cn } from "@/lib/utils";

type ProfileArenaLevelBarProps = {
  locale: string;
  score: number;
  className?: string;
};

export async function ProfileArenaLevelBar({
  locale,
  score,
  className,
}: ProfileArenaLevelBarProps) {
  const t = await getTranslations({ locale, namespace: "social.profile" });
  const { level, nextLevel, ratio, remainingToNext, isMaxLevel } =
    getArenaLevelProgressFromScore(score);

  const scoreLabel = formatTokenCount(score, locale);
  const remainingLabel = remainingToNext.toLocaleString(locale);
  const caption = isMaxLevel
    ? t("arenaMaxLevelCaption", {
        score: scoreLabel,
      })
    : t("arenaProgressCaption", {
        score: scoreLabel,
        remaining: remainingLabel,
        nextLevel: nextLevel.toLocaleString(locale),
      });

  const pct = Math.round(ratio * 100);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-3">
        <span
          className="shrink-0 text-xs font-semibold tabular-nums text-primary"
          title={t("arenaLevel")}
        >
          Lv.{level.toLocaleString(locale)}
        </span>

        <div
          className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={t("arenaScore")}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <p className="text-center text-[11px] leading-snug text-muted-foreground">
        {caption}
      </p>
    </div>
  );
}
