"use client";

import { Calendar } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  formatDuration,
  formatTokenCount,
  formatUsdAmount,
} from "@/lib/usage/format";
import type {
  HourlyActivityHeatmapCell,
  HourlyActivityHeatmapMetric,
} from "@/lib/usage/types";
import { cn } from "@/lib/utils";

type HourlyActivityHeatmapCardProps = {
  data: HourlyActivityHeatmapCell[];
  defaultMetric?: HourlyActivityHeatmapMetric;
};

const METRIC_OPTIONS = [
  { value: "totalTokens", labelKey: "views.tokens" },
  { value: "estimatedCostUsd", labelKey: "views.cost" },
  { value: "activeSeconds", labelKey: "views.activeTime" },
] as const satisfies Array<{
  value: HourlyActivityHeatmapMetric;
  labelKey: "views.tokens" | "views.cost" | "views.activeTime";
}>;

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const HOURS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23,
] as const;

const HEATMAP_LEVEL_MIXES = [16, 28, 40, 54, 72] as const;
const HEATMAP_METRIC_COLORS = {
  inputTokens: "var(--chart-1)",
  outputTokens: "var(--chart-1)",
  totalTokens: "var(--chart-1)",
  estimatedCostUsd: "var(--chart-2)",
  activeSeconds: "var(--chart-3)",
} as const satisfies Record<HourlyActivityHeatmapMetric, string>;

const EMPTY_CELL_STYLE = {
  backgroundColor: "color-mix(in oklab, var(--muted) 82%, var(--background))",
} as const;

function formatMetricValue(
  value: number,
  metric: HourlyActivityHeatmapMetric,
  locale: string,
) {
  if (metric === "estimatedCostUsd") {
    return formatUsdAmount(value, locale);
  }

  if (metric === "activeSeconds") {
    return formatDuration(value);
  }

  return formatTokenCount(value, locale);
}

function getMetricLevel(
  value: number,
  metric: HourlyActivityHeatmapMetric,
  data: HourlyActivityHeatmapCell[],
) {
  const nonZeroValues = data
    .map((cell) => cell[metric])
    .filter((currentValue) => currentValue > 0)
    .sort((left, right) => left - right);

  if (value <= 0 || nonZeroValues.length === 0) {
    return null;
  }

  let rank = 0;
  for (const currentValue of nonZeroValues) {
    if (currentValue <= value) {
      rank += 1;
      continue;
    }

    break;
  }

  if (nonZeroValues.length === 1) {
    return HEATMAP_LEVEL_MIXES.length - 1;
  }

  const percentile = (rank - 1) / (nonZeroValues.length - 1);
  const boostedPercentile = percentile ** 0.78;

  return Math.min(
    HEATMAP_LEVEL_MIXES.length - 1,
    Math.max(
      0,
      Math.round(boostedPercentile * (HEATMAP_LEVEL_MIXES.length - 1)),
    ),
  );
}

function getHeatmapStyle(
  level: number | null,
  metric: HourlyActivityHeatmapMetric,
) {
  if (level === null) {
    return EMPTY_CELL_STYLE;
  }

  const mix = HEATMAP_LEVEL_MIXES[level];
  const accentColor = HEATMAP_METRIC_COLORS[metric];

  return {
    backgroundColor: `color-mix(in oklab, ${accentColor} ${mix}%, var(--background))`,
    boxShadow:
      "inset 0 1px 0 color-mix(in oklab, var(--background) 80%, transparent)",
  };
}

function buildTooltipLabel(input: {
  cell: HourlyActivityHeatmapCell;
  metric: HourlyActivityHeatmapMetric;
  locale: string;
  t: (key: string, values?: Record<string, number | string>) => string;
}) {
  const weekdayLabel = input.t(`weekdays.${WEEKDAY_KEYS[input.cell.weekday]}`);
  const hourLabel = `${String(input.cell.hour).padStart(2, "0")}:00`;
  const metricLabel = input.t(`metrics.${input.metric}`);
  const metricValue = formatMetricValue(
    input.cell[input.metric],
    input.metric,
    input.locale,
  );
  const sessionsLabel =
    input.cell.sessions > 0
      ? ` · ${input.t("sessions", { count: input.cell.sessions })}`
      : "";

  return `${weekdayLabel} ${hourLabel} · ${metricLabel} ${metricValue}${sessionsLabel}`;
}

export function HourlyActivityHeatmapCard({
  data,
  defaultMetric = "totalTokens",
}: HourlyActivityHeatmapCardProps) {
  const locale = useLocale();
  const t = useTranslations("usage.hourlyHeatmap");
  const [metric, setMetric] =
    useState<HourlyActivityHeatmapMetric>(defaultMetric);
  const showEmptyCostState =
    metric === "estimatedCostUsd" &&
    data.every((cell) => cell.estimatedCostUsd <= 0);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div className="flex w-full min-w-0 flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Calendar className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-medium text-foreground">
              {t("title")}
            </span>
          </div>

          <div className="inline-flex shrink-0 items-center gap-1">
            {METRIC_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="xs"
                variant={metric === option.value ? "secondary" : "ghost"}
                onClick={() => setMetric(option.value)}
              >
                {t(option.labelKey)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-5">
        <div
          className="grid w-full gap-x-0.5 gap-y-1"
          style={{
            gridTemplateColumns: "2.25rem repeat(24, minmax(0, 1fr))",
          }}
        >
          {WEEKDAY_KEYS.map((weekdayKey, weekday) => (
            <Fragment key={weekdayKey}>
              <div className="flex items-center pr-1.5 text-[11px] font-medium text-muted-foreground">
                {t(`weekdays.${weekdayKey}`)}
              </div>

              {HOURS.map((hour) => {
                const cell = data[weekday * 24 + hour];

                if (!cell) {
                  return (
                    <div
                      key={`${weekdayKey}-${String(hour).padStart(2, "0")}`}
                      aria-hidden="true"
                      className="aspect-square w-full rounded-[6px] ring-1 ring-border/20"
                      style={EMPTY_CELL_STYLE}
                    />
                  );
                }

                const level = getMetricLevel(cell[metric], metric, data);
                const tooltipLabel = buildTooltipLabel({
                  cell,
                  metric,
                  locale,
                  t,
                });

                return (
                  <div
                    key={`${weekdayKey}-${String(hour).padStart(2, "0")}`}
                    role="img"
                    title={tooltipLabel}
                    aria-label={tooltipLabel}
                    className={cn(
                      "aspect-square w-full rounded-[6px] ring-1 ring-border/20 transition-all duration-150 ease-out",
                      "hover:z-10 hover:-translate-y-0.5 hover:scale-[1.07] hover:ring-foreground/40 hover:shadow-[0_12px_30px_-18px_rgba(0,0,0,0.45)]",
                    )}
                    style={getHeatmapStyle(level, metric)}
                  />
                );
              })}
            </Fragment>
          ))}

          <div aria-hidden="true" />
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="pt-1 text-center text-[10px] leading-none text-muted-foreground"
            >
              {hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-2 text-sm text-muted-foreground sm:shrink-0">
            <span>{t("less")}</span>
            {HEATMAP_LEVEL_MIXES.map((_, level) => (
              <span
                key={`legend-${HEATMAP_LEVEL_MIXES[level]}`}
                className="size-3 rounded-[4px] ring-1 ring-border/30"
                style={getHeatmapStyle(level, metric)}
              />
            ))}
            <span>{t("more")}</span>
          </div>
        </div>

        {showEmptyCostState ? (
          <p className="text-xs text-muted-foreground">{t("emptyCost")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
