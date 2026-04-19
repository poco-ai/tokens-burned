"use client";

import { Activity, Calendar } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  TokenTrendPoint,
} from "@/lib/usage/types";
import { cn } from "@/lib/utils";
import { TokenTrendTooltipContent } from "./token-trend-card";

type VisualizationMode = "trend" | "heatmap";
type VisualizationMetricView = "tokens" | "cost" | "time";
type TrendMetricView = "tokens" | "cost" | "totalTime";

type UsageVisualizationCardProps = {
  trendData: TokenTrendPoint[];
  heatmapData: HourlyActivityHeatmapCell[];
  defaultMode?: VisualizationMode;
  defaultMetricView?: VisualizationMetricView;
};

const MODE_OPTIONS = [
  { value: "trend", labelKey: "title", icon: Activity },
  { value: "heatmap", labelKey: "title", icon: Calendar },
] as const;

const METRIC_OPTIONS = [
  { value: "tokens", labelKey: "views.tokens" },
  { value: "cost", labelKey: "views.cost" },
  { value: "time", labelKey: "views.totalTime" },
] as const satisfies Array<{
  value: VisualizationMetricView;
  labelKey: "views.tokens" | "views.cost" | "views.totalTime";
}>;

const TREND_SERIES = [
  {
    dataKey: "cachedTokens",
    labelKey: "cache",
    color: "var(--chart-1)",
    opacity: 1,
    radius: [0, 0, 0, 0] as [number, number, number, number],
  },
  {
    dataKey: "inputTokens",
    labelKey: "input",
    color: "var(--chart-1)",
    opacity: 0.72,
    radius: [0, 0, 0, 0] as [number, number, number, number],
  },
  {
    dataKey: "outputTokens",
    labelKey: "output",
    color: "var(--chart-1)",
    opacity: 0.44,
    radius: [0, 0, 0, 0] as [number, number, number, number],
  },
  {
    dataKey: "reasoningTokens",
    labelKey: "reasoning",
    color: "var(--chart-1)",
    opacity: 0.28,
    radius: [6, 6, 0, 0] as [number, number, number, number],
  },
] as const;

const TREND_INITIAL_DIMENSION = {
  width: 1120,
  height: 352,
} as const;

const VISUALIZATION_PANEL_HEIGHT_CLASS = "h-[22rem]";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const HOURS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23,
] as const;

const HEATMAP_LEVEL_MIXES = [16, 28, 40, 54, 72] as const;
const HEATMAP_METRIC_COLORS = {
  totalTokens: "var(--chart-1)",
  estimatedCostUsd: "var(--chart-2)",
  activeSeconds: "var(--chart-3)",
} as const satisfies Record<
  Extract<
    HourlyActivityHeatmapMetric,
    "totalTokens" | "estimatedCostUsd" | "activeSeconds"
  >,
  string
>;

const EMPTY_CELL_STYLE = {
  backgroundColor: "color-mix(in oklab, var(--muted) 82%, var(--background))",
} as const;

function formatTrendAxisValue(
  value: number,
  view: TrendMetricView,
  locale: string,
) {
  if (view === "cost") {
    return formatUsdAmount(value, locale, { compact: true });
  }

  if (view === "totalTime") {
    return formatDuration(value, { compact: true });
  }

  return formatTokenCount(value);
}

function getHeatmapMetric(
  metricView: VisualizationMetricView,
): Extract<
  HourlyActivityHeatmapMetric,
  "totalTokens" | "estimatedCostUsd" | "activeSeconds"
> {
  if (metricView === "cost") {
    return "estimatedCostUsd";
  }

  if (metricView === "time") {
    return "activeSeconds";
  }

  return "totalTokens";
}

function getTrendMetricView(
  metricView: VisualizationMetricView,
): TrendMetricView {
  return metricView === "time" ? "totalTime" : metricView;
}

function formatHeatmapMetricValue(
  value: number,
  metric: Extract<
    HourlyActivityHeatmapMetric,
    "totalTokens" | "estimatedCostUsd" | "activeSeconds"
  >,
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

function getHeatmapLevel(
  value: number,
  metric: Extract<
    HourlyActivityHeatmapMetric,
    "totalTokens" | "estimatedCostUsd" | "activeSeconds"
  >,
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
  metric: Extract<
    HourlyActivityHeatmapMetric,
    "totalTokens" | "estimatedCostUsd" | "activeSeconds"
  >,
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

function buildHeatmapTooltipLabel(input: {
  cell: HourlyActivityHeatmapCell;
  metric: Extract<
    HourlyActivityHeatmapMetric,
    "totalTokens" | "estimatedCostUsd" | "activeSeconds"
  >;
  locale: string;
  tHeatmap: (key: string, values?: Record<string, number | string>) => string;
}) {
  const weekdayLabel = input.tHeatmap(
    `weekdays.${WEEKDAY_KEYS[input.cell.weekday]}`,
  );
  const hourLabel = `${String(input.cell.hour).padStart(2, "0")}:00`;
  const metricLabel = input.tHeatmap(`metrics.${input.metric}`);
  const metricValue = formatHeatmapMetricValue(
    input.cell[input.metric],
    input.metric,
    input.locale,
  );
  const sessionsLabel =
    input.cell.sessions > 0
      ? ` · ${input.tHeatmap("sessions", { count: input.cell.sessions })}`
      : "";

  return `${weekdayLabel} ${hourLabel} · ${metricLabel} ${metricValue}${sessionsLabel}`;
}

function TrendLegend({
  metricView,
  className,
}: {
  metricView: VisualizationMetricView;
  className?: string;
}) {
  const tTrend = useTranslations("usage.trend");

  if (metricView === "tokens") {
    return (
      <div
        className={cn(
          "flex min-h-6 flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground",
          className,
        )}
      >
        {TREND_SERIES.map((series) => (
          <div key={series.dataKey} className="flex items-center gap-2">
            <span
              className="size-3 rounded-sm"
              style={{
                backgroundColor: series.color,
                opacity: series.opacity,
              }}
            />
            <span>{tTrend(series.labelKey)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-6 items-center gap-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <span
        className="size-3 rounded-sm"
        style={{
          backgroundColor:
            metricView === "cost" ? "var(--chart-2)" : "var(--chart-3)",
        }}
      />
      <span>
        {metricView === "cost" ? tTrend("cost") : tTrend("totalTime")}
      </span>
    </div>
  );
}

export function UsageVisualizationCard({
  trendData,
  heatmapData,
  defaultMode = "trend",
  defaultMetricView = "tokens",
}: UsageVisualizationCardProps) {
  const locale = useLocale();
  const tTrend = useTranslations("usage.trend");
  const tHeatmap = useTranslations("usage.hourlyHeatmap");
  const [mode, setMode] = useState<VisualizationMode>(defaultMode);
  const [metricView, setMetricView] =
    useState<VisualizationMetricView>(defaultMetricView);

  const trendMetricView = getTrendMetricView(metricView);
  const heatmapMetric = getHeatmapMetric(metricView);
  const showTrendEmptyCostState =
    metricView === "cost" &&
    trendData.every((point) => point.estimatedCostUsd <= 0);
  const showHeatmapEmptyCostState =
    metricView === "cost" &&
    heatmapData.every((cell) => cell.estimatedCostUsd <= 0);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex min-w-0 flex-wrap items-center gap-2 lg:shrink-0">
            {MODE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const label =
                option.value === "trend"
                  ? tTrend(option.labelKey)
                  : tHeatmap(option.labelKey);

              return (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={mode === option.value ? "secondary" : "ghost"}
                  className="max-w-full"
                  onClick={() => setMode(option.value)}
                >
                  <Icon className="size-4" />
                  <span className="truncate">{label}</span>
                </Button>
              );
            })}
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-start gap-x-4 gap-y-2 lg:justify-end">
            {mode === "trend" ? (
              <TrendLegend metricView={metricView} className="min-w-0" />
            ) : null}

            <div className="inline-flex shrink-0 items-center gap-2">
              {METRIC_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={metricView === option.value ? "secondary" : "ghost"}
                  onClick={() => setMetricView(option.value)}
                >
                  {tTrend(option.labelKey)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 pt-1">
        {mode === "trend" ? (
          showTrendEmptyCostState ? (
            <div
              className={cn(
                "flex items-center rounded-xl border border-dashed px-4 text-sm text-muted-foreground",
                VISUALIZATION_PANEL_HEIGHT_CLASS,
              )}
            >
              {tTrend("emptyCost")}
            </div>
          ) : (
            <div
              className={cn("w-full min-w-0", VISUALIZATION_PANEL_HEIGHT_CLASS)}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
                initialDimension={TREND_INITIAL_DIMENSION}
              >
                <BarChart
                  data={trendData}
                  margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                  barGap={0}
                  barCategoryGap="8%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="label"
                    minTickGap={24}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      formatTrendAxisValue(value, trendMetricView, locale)
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                    content={(props) => (
                      <TokenTrendTooltipContent
                        {...props}
                        view={trendMetricView}
                        locale={locale}
                      />
                    )}
                  />
                  {trendMetricView === "tokens" ? (
                    TREND_SERIES.map((series) => (
                      <Bar
                        key={series.dataKey}
                        dataKey={series.dataKey}
                        name={tTrend(series.labelKey)}
                        stackId="tokens"
                        fill={series.color}
                        fillOpacity={series.opacity}
                        radius={series.radius}
                      />
                    ))
                  ) : trendMetricView === "cost" ? (
                    <Bar
                      dataKey="estimatedCostUsd"
                      name={tTrend("cost")}
                      fill="var(--chart-2)"
                      radius={[6, 6, 0, 0]}
                    />
                  ) : (
                    <Bar
                      dataKey="totalSeconds"
                      name={tTrend("totalTime")}
                      fill="var(--chart-3)"
                      radius={[6, 6, 0, 0]}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )
        ) : (
          <div
            className={cn(
              "flex flex-col justify-between",
              VISUALIZATION_PANEL_HEIGHT_CLASS,
            )}
          >
            <div className="flex min-h-0 flex-1 items-center">
              <div className="mx-auto w-full max-w-[1000px]">
                <div
                  className="grid w-full gap-x-0.5 gap-y-1"
                  style={{
                    gridTemplateColumns: "3rem repeat(24, minmax(0, 1fr))",
                  }}
                >
                  {WEEKDAY_KEYS.map((weekdayKey, weekday) => (
                    <Fragment key={weekdayKey}>
                      <div className="flex items-center pr-2 text-xs font-medium text-muted-foreground">
                        {tHeatmap(`weekdays.${weekdayKey}`)}
                      </div>

                      {HOURS.map((hour) => {
                        const cell = heatmapData[weekday * 24 + hour];

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

                        const level = getHeatmapLevel(
                          cell[heatmapMetric],
                          heatmapMetric,
                          heatmapData,
                        );
                        const tooltipLabel = buildHeatmapTooltipLabel({
                          cell,
                          metric: heatmapMetric,
                          locale,
                          tHeatmap,
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
                            style={getHeatmapStyle(level, heatmapMetric)}
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
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-2 text-sm text-muted-foreground">
                <span>{tHeatmap("less")}</span>
                {HEATMAP_LEVEL_MIXES.map((_, level) => (
                  <span
                    key={`legend-${HEATMAP_LEVEL_MIXES[level]}`}
                    className="size-3 rounded-[4px] ring-1 ring-border/30"
                    style={getHeatmapStyle(level, heatmapMetric)}
                  />
                ))}
                <span>{tHeatmap("more")}</span>
              </div>
            </div>

            {showHeatmapEmptyCostState ? (
              <p className="text-xs text-muted-foreground">
                {tHeatmap("emptyCost")}
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
