import {
  formatDuration,
  formatPercentage,
  formatTokenCount,
} from "@/lib/usage/format";
import type { AchievementProgressUnit } from "./types";

const currencyFormatterCache = new Map<
  string,
  Map<string, Intl.NumberFormat>
>();

function getCurrencyFormatter(locale: string, maximumFractionDigits: number) {
  let byDigits = currencyFormatterCache.get(locale);
  if (!byDigits) {
    byDigits = new Map();
    currencyFormatterCache.set(locale, byDigits);
  }
  const cacheKey = String(maximumFractionDigits);
  let formatter = byDigits.get(cacheKey);
  if (!formatter) {
    formatter = Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits,
    });
    byDigits.set(cacheKey, formatter);
  }
  return formatter;
}

function formatAchievementMetric(input: {
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
      return getCurrencyFormatter(
        input.locale,
        input.value >= 1000 ? 0 : 2,
      ).format(input.value);
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
