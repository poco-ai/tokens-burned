"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
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
import type { TokenTrendPoint } from "@/lib/usage/types";

type TrendMetricView = "tokens" | "cost" | "totalTime";

type TokenTrendCardProps = {
  data: TokenTrendPoint[];
  defaultMetricView?: TrendMetricView;
};

type TokenTrendTooltipContentProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{
    payload?: TokenTrendPoint;
  }>;
  view: TrendMetricView;
  locale: string;
};

const TREND_VIEW_OPTIONS = [
  { value: "tokens", labelKey: "views.tokens" },
  { value: "cost", labelKey: "views.cost" },
  { value: "totalTime", labelKey: "views.totalTime" },
] as const satisfies Array<{
  value: TrendMetricView;
  labelKey: "views.tokens" | "views.cost" | "views.totalTime";
}>;

const TOKEN_TREND_INITIAL_DIMENSION = {
  width: 720,
  height: 320,
} as const;

const TOKEN_TREND_SERIES = [
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

const TOKEN_TREND_TOOLTIP_STYLES = {
  total: {
    backgroundColor: "var(--foreground)",
  },
  cache: {
    backgroundColor: TOKEN_TREND_SERIES[0].color,
    opacity: TOKEN_TREND_SERIES[0].opacity,
  },
  input: {
    backgroundColor: TOKEN_TREND_SERIES[1].color,
    opacity: TOKEN_TREND_SERIES[1].opacity,
  },
  output: {
    backgroundColor: TOKEN_TREND_SERIES[2].color,
    opacity: TOKEN_TREND_SERIES[2].opacity,
  },
  reasoning: {
    backgroundColor: TOKEN_TREND_SERIES[3].color,
    opacity: TOKEN_TREND_SERIES[3].opacity,
  },
  cost: {
    backgroundColor: "var(--chart-2)",
  },
  totalTime: {
    backgroundColor: "var(--chart-3)",
  },
} as const;

type TokenTrendTooltipLabelKey = keyof typeof TOKEN_TREND_TOOLTIP_STYLES;

type TokenTrendTooltipRow = {
  labelKey: TokenTrendTooltipLabelKey;
  kind: "tokens" | "currency" | "duration";
  value: number;
};

function formatTrendMetricValue(
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

function formatTooltipRowValue(
  row: TokenTrendTooltipRow,
  locale: string,
): string {
  switch (row.kind) {
    case "currency":
      return formatUsdAmount(row.value, locale);
    case "duration":
      return formatDuration(row.value);
    default:
      return formatTokenCount(row.value);
  }
}

function getTooltipRows(
  point: TokenTrendPoint,
  view: TrendMetricView,
): TokenTrendTooltipRow[] {
  if (view === "cost") {
    return [
      { labelKey: "cost", kind: "currency", value: point.estimatedCostUsd },
      { labelKey: "total", kind: "tokens", value: point.totalTokens },
      { labelKey: "totalTime", kind: "duration", value: point.totalSeconds },
    ];
  }

  if (view === "totalTime") {
    return [
      { labelKey: "totalTime", kind: "duration", value: point.totalSeconds },
      { labelKey: "total", kind: "tokens", value: point.totalTokens },
      { labelKey: "cost", kind: "currency", value: point.estimatedCostUsd },
    ];
  }

  return [
    { labelKey: "total", kind: "tokens", value: point.totalTokens },
    { labelKey: "cache", kind: "tokens", value: point.cachedTokens },
    { labelKey: "input", kind: "tokens", value: point.inputTokens },
    { labelKey: "output", kind: "tokens", value: point.outputTokens },
    { labelKey: "reasoning", kind: "tokens", value: point.reasoningTokens },
    { labelKey: "cost", kind: "currency", value: point.estimatedCostUsd },
    { labelKey: "totalTime", kind: "duration", value: point.totalSeconds },
  ];
}

export function TokenTrendTooltipContent({
  active,
  label,
  payload,
  view,
  locale,
}: TokenTrendTooltipContentProps) {
  const t = useTranslations("usage.trend");
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="min-w-48 rounded-lg border bg-background/95 p-3 shadow-md">
      <div className="mb-3 text-sm font-medium text-foreground">
        {String(label ?? point.label)}
      </div>
      <div className="space-y-1.5">
        {getTooltipRows(point, view).map((row) => (
          <div
            key={row.labelKey}
            className="flex items-center justify-between gap-6 text-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={TOKEN_TREND_TOOLTIP_STYLES[row.labelKey]}
              />
              <span className="text-muted-foreground">{t(row.labelKey)}</span>
            </div>
            <span className="font-medium text-foreground">
              {formatTooltipRowValue(row, locale)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TokenTrendCard({
  data,
  defaultMetricView = "tokens",
}: TokenTrendCardProps) {
  const locale = useLocale();
  const t = useTranslations("usage.trend");
  const [metricView, setMetricView] =
    useState<TrendMetricView>(defaultMetricView);
  const hasCostData = data.some((point) => point.estimatedCostUsd > 0);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div className="flex w-full min-w-0 flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <div className="inline-flex shrink-0 items-center gap-1">
              {TREND_VIEW_OPTIONS.map((view) => (
                <Button
                  key={view.value}
                  type="button"
                  size="xs"
                  variant={metricView === view.value ? "secondary" : "ghost"}
                  onClick={() => setMetricView(view.value)}
                >
                  {t(view.labelKey)}
                </Button>
              ))}
            </div>
          </div>

          {metricView === "tokens" ? (
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-muted-foreground sm:shrink-0">
              {TOKEN_TREND_SERIES.map((series) => (
                <div key={series.dataKey} className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-sm"
                    style={{
                      backgroundColor: series.color,
                      opacity: series.opacity,
                    }}
                  />
                  <span>{t(series.labelKey)}</span>
                </div>
              ))}
            </div>
          ) : metricView === "totalTime" ? (
            <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
              <span
                className="size-3 rounded-sm"
                style={{ backgroundColor: "var(--chart-3)" }}
              />
              <span>{t("totalTime")}</span>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
              <span
                className="size-3 rounded-sm"
                style={{ backgroundColor: "var(--chart-2)" }}
              />
              <span>{t("cost")}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {metricView === "cost" && !hasCostData ? (
          <div className="flex h-80 items-center rounded-xl border border-dashed px-4 text-sm text-muted-foreground">
            {t("emptyCost")}
          </div>
        ) : (
          <div className="h-80 w-full min-w-0">
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={TOKEN_TREND_INITIAL_DIMENSION}
            >
              <BarChart
                data={data}
                margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                barGap={0}
                barCategoryGap="8%"
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  minTickGap={24}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) =>
                    formatTrendMetricValue(value, metricView, locale)
                  }
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                  content={(props) => (
                    <TokenTrendTooltipContent
                      {...props}
                      view={metricView}
                      locale={locale}
                    />
                  )}
                />
                {metricView === "tokens" ? (
                  TOKEN_TREND_SERIES.map((series) => (
                    <Bar
                      key={series.dataKey}
                      dataKey={series.dataKey}
                      name={t(series.labelKey)}
                      stackId="tokens"
                      fill={series.color}
                      fillOpacity={series.opacity}
                      radius={series.radius}
                    />
                  ))
                ) : metricView === "cost" ? (
                  <Bar
                    dataKey="estimatedCostUsd"
                    name={t("cost")}
                    fill="var(--chart-2)"
                    radius={[6, 6, 0, 0]}
                  />
                ) : (
                  <Bar
                    dataKey="totalSeconds"
                    name={t("totalTime")}
                    fill="var(--chart-3)"
                    radius={[6, 6, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
