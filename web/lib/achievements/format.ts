import {
  formatDuration,
  formatPercentage,
  formatTokenCount,
} from "@/lib/usage/format";
import type { AchievementProgressUnit, AchievementTier } from "./types";

export function formatAchievementMetric(input: {
  value: number;
  unit: AchievementProgressUnit;
  locale: string;
}) {
  switch (input.unit) {
    case "tokens":
      return formatTokenCount(input.value, input.locale);
    case "seconds":
      return formatDuration(Math.round(input.value));
    case "percent":
      return formatPercentage(input.value, input.locale);
    case "usd":
      return new Intl.NumberFormat(input.locale, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: input.value >= 1000 ? 0 : 2,
      }).format(input.value);
    default:
      return Math.floor(input.value).toLocaleString(input.locale);
  }
}

export function formatAchievementProgress(input: {
  current: number;
  target: number;
  unit: AchievementProgressUnit;
  locale: string;
}) {
  return `${formatAchievementMetric({
    value: Math.min(input.current, input.target),
    unit: input.unit,
    locale: input.locale,
  })} / ${formatAchievementMetric({
    value: input.target,
    unit: input.unit,
    locale: input.locale,
  })}`;
}

export function formatAchievementDate(input: {
  value: string;
  locale: string;
  timezone: string;
}) {
  return new Intl.DateTimeFormat(input.locale, {
    timeZone: input.timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(input.value));
}

export function getTierTone(tier: AchievementTier) {
  switch (tier) {
    case "special":
      return "bg-violet-500/12 text-violet-700 dark:text-violet-300";
    case "gold":
      return "bg-amber-500/12 text-amber-700 dark:text-amber-300";
    case "silver":
      return "bg-slate-500/12 text-slate-700 dark:text-slate-300";
    default:
      return "bg-orange-500/12 text-orange-700 dark:text-orange-300";
  }
}
