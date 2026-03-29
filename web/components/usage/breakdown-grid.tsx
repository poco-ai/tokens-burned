"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDuration,
  formatPercentage,
  formatTokenCount,
  formatUsdAmount,
} from "@/lib/usage/format";
import type { BreakdownRow, UsageBreakdowns } from "@/lib/usage/types";
import { CollapsibleSection } from "./collapsible-section";

type BreakdownGridProps = {
  breakdowns: UsageBreakdowns;
  defaultOpen?: boolean;
  defaultMetricView?: BreakdownMetricView;
};

type BreakdownMetricView = "tokens" | "cost";
type BreakdownMetric = "estimatedCostUsd" | "totalTokens";
type BreakdownKey = keyof UsageBreakdowns;
type BreakdownChartDatum = {
  key: string;
  name: string;
  shortName: string;
  value: number;
  valueLabel: string;
  share: number;
  totalTokens: number;
  estimatedCostUsd: number;
  totalSeconds: number;
  sessions: number;
  messages: number;
};

type BreakdownMetricViews = Record<BreakdownKey, BreakdownMetricView>;

const cards = [
  {
    key: "devices",
    labelKey: "devices",
    emptyLabelKey: "devices",
  },
  {
    key: "tools",
    labelKey: "tools",
    emptyLabelKey: "tools",
  },
  {
    key: "models",
    labelKey: "models",
    emptyLabelKey: "models",
  },
  {
    key: "projects",
    labelKey: "projects",
    emptyLabelKey: "projects",
  },
] as const satisfies Array<{
  key: BreakdownKey;
  labelKey: "devices" | "models" | "projects" | "tools";
  emptyLabelKey: "devices" | "models" | "projects" | "tools";
}>;

const BREAKDOWN_CHART_INITIAL_WIDTH = 720;
const maxVisibleRows = 5;

const BREAKDOWN_VIEW_OPTIONS = [
  { value: "tokens", labelKey: "views.tokens" },
  { value: "cost", labelKey: "views.cost" },
] as const satisfies Array<{
  value: BreakdownMetricView;
  labelKey: "views.tokens" | "views.cost";
}>;

function aggregateRows(rows: BreakdownRow[], name: string): BreakdownRow {
  return rows.reduce<BreakdownRow>(
    (result, row) => {
      result.totalTokens += row.totalTokens;
      result.inputTokens += row.inputTokens;
      result.outputTokens += row.outputTokens;
      result.reasoningTokens += row.reasoningTokens;
      result.cachedTokens += row.cachedTokens;
      result.estimatedCostUsd += row.estimatedCostUsd;
      result.activeSeconds += row.activeSeconds;
      result.totalSeconds += row.totalSeconds;
      result.sessions += row.sessions;
      result.messages += row.messages;
      result.userMessages += row.userMessages;
      result.share += row.share;

      return result;
    },
    {
      key: "__others__",
      name,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cachedTokens: 0,
      estimatedCostUsd: 0,
      activeSeconds: 0,
      totalSeconds: 0,
      sessions: 0,
      messages: 0,
      userMessages: 0,
      share: 0,
    },
  );
}

function getDisplayRows(rows: BreakdownRow[], otherLabel: string) {
  if (rows.length <= maxVisibleRows) {
    return rows;
  }

  return [
    ...rows.slice(0, maxVisibleRows - 1),
    aggregateRows(rows.slice(maxVisibleRows - 1), otherLabel),
  ];
}

function getMetricValue(row: BreakdownRow, metric: BreakdownMetric) {
  switch (metric) {
    case "estimatedCostUsd":
      return row.estimatedCostUsd;
    case "totalTokens":
      return row.totalTokens;
  }
}

function sortRowsByMetric(rows: BreakdownRow[], metric: BreakdownMetric) {
  return [...rows].sort((left, right) => {
    const diff = getMetricValue(right, metric) - getMetricValue(left, metric);

    if (diff !== 0) {
      return diff;
    }

    if (right.totalTokens !== left.totalTokens) {
      return right.totalTokens - left.totalTokens;
    }

    return right.estimatedCostUsd - left.estimatedCostUsd;
  });
}

function getMetricShare(
  rows: BreakdownRow[],
  row: BreakdownRow,
  metric: BreakdownMetric,
) {
  const total = rows.reduce(
    (sum, item) => sum + getMetricValue(item, metric),
    0,
  );

  if (total === 0) {
    return 0;
  }

  return getMetricValue(row, metric) / total;
}

function getMetricLabelKey(metric: BreakdownMetric) {
  switch (metric) {
    case "estimatedCostUsd":
      return "estimatedCost";
    case "totalTokens":
      return "totalTokens";
  }
}

function formatMetricValue(
  value: number,
  metric: BreakdownMetric,
  locale: string,
) {
  if (metric === "estimatedCostUsd") {
    return formatUsdAmount(value, locale, { compact: true });
  }

  return formatTokenCount(value);
}

function truncateLabel(value: string, maxLength = 14) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function toChartData(
  rows: BreakdownRow[],
  metric: BreakdownMetric,
  locale: string,
): BreakdownChartDatum[] {
  return rows.map((row) => {
    const value = getMetricValue(row, metric);

    return {
      key: row.key,
      name: row.name,
      shortName: truncateLabel(row.name),
      value,
      valueLabel: formatMetricValue(value, metric, locale),
      share: getMetricShare(rows, row, metric),
      totalTokens: row.totalTokens,
      estimatedCostUsd: row.estimatedCostUsd,
      totalSeconds: row.totalSeconds,
      sessions: row.sessions,
      messages: row.messages,
    };
  });
}

function createInitialMetricViews(
  defaultMetricView: BreakdownMetricView,
): BreakdownMetricViews {
  return cards.reduce<BreakdownMetricViews>(
    (result, card) => {
      result[card.key] = defaultMetricView;
      return result;
    },
    {
      devices: defaultMetricView,
      tools: defaultMetricView,
      models: defaultMetricView,
      projects: defaultMetricView,
    },
  );
}

type BreakdownTooltipContentProps = {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload?: BreakdownChartDatum;
  }>;
  metric: BreakdownMetric;
  locale: string;
};

function BreakdownTooltipContent({
  active,
  payload,
  metric,
  locale,
}: BreakdownTooltipContentProps) {
  const t = useTranslations("usage.breakdowns.table");
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="min-w-48 rounded-lg border bg-background/95 p-3 shadow-md">
      <div className="mb-3 text-sm font-medium text-foreground">
        {point.name}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="text-muted-foreground">
            {t(getMetricLabelKey(metric))}
          </span>
          <span className="font-medium text-foreground">
            {formatMetricValue(point.value, metric, locale)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="text-muted-foreground">{t("share")}</span>
          <span className="font-medium text-foreground">
            {formatPercentage(point.share, locale)}
          </span>
        </div>
        {metric !== "totalTokens" ? (
          <div className="flex items-center justify-between gap-6 text-sm">
            <span className="text-muted-foreground">{t("totalTokens")}</span>
            <span className="font-medium text-foreground">
              {formatTokenCount(point.totalTokens)}
            </span>
          </div>
        ) : null}
        {metric !== "estimatedCostUsd" ? (
          <div className="flex items-center justify-between gap-6 text-sm">
            <span className="text-muted-foreground">{t("estimatedCost")}</span>
            <span className="font-medium text-foreground">
              {formatUsdAmount(point.estimatedCostUsd, locale)}
            </span>
          </div>
        ) : null}
        {point.totalSeconds > 0 ? (
          <div className="flex items-center justify-between gap-6 text-sm">
            <span className="text-muted-foreground">{t("totalTime")}</span>
            <span className="font-medium text-foreground">
              {formatDuration(point.totalSeconds)}
            </span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="text-muted-foreground">{t("sessions")}</span>
          <span className="font-medium text-foreground">
            {formatTokenCount(point.sessions)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="text-muted-foreground">{t("messages")}</span>
          <span className="font-medium text-foreground">
            {formatTokenCount(point.messages)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function BreakdownGrid({
  breakdowns,
  defaultOpen = false,
  defaultMetricView = "tokens",
}: BreakdownGridProps) {
  const locale = useLocale();
  const t = useTranslations("usage.breakdowns");
  const [metricViews, setMetricViews] = useState<BreakdownMetricViews>(() =>
    createInitialMetricViews(defaultMetricView),
  );

  return (
    <CollapsibleSection
      title={t("title")}
      description={t("description")}
      defaultOpen={defaultOpen}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((card) => {
          const metricView = metricViews[card.key];
          const metric: BreakdownMetric =
            metricView === "cost" ? "estimatedCostUsd" : "totalTokens";
          const rows = getDisplayRows(
            sortRowsByMetric(breakdowns[card.key], metric),
            t("others"),
          );
          const chartData = toChartData(rows, metric, locale);
          const chartHeight = Math.max(chartData.length * 40 + 20, 196);
          const hasMetricData = chartData.some((row) => row.value > 0);

          return (
            <Card key={card.key} size="sm" className="min-h-[280px]">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                <CardTitle className="min-w-0 shrink truncate">
                  {t(`tabs.${card.labelKey}`)}
                </CardTitle>
                <div className="inline-flex shrink-0 items-center gap-1">
                  {BREAKDOWN_VIEW_OPTIONS.map((view) => (
                    <Button
                      key={view.value}
                      type="button"
                      size="xs"
                      variant={
                        metricView === view.value ? "secondary" : "ghost"
                      }
                      onClick={() =>
                        setMetricViews((current) => ({
                          ...current,
                          [card.key]: view.value,
                        }))
                      }
                    >
                      {t(view.labelKey)}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                {chartData.length === 0 ? (
                  <div className="flex flex-1 items-center rounded-xl border border-dashed px-4 text-sm text-muted-foreground">
                    {t(`empty.${card.emptyLabelKey}`)}
                  </div>
                ) : metric === "estimatedCostUsd" && !hasMetricData ? (
                  <div className="flex flex-1 items-center rounded-xl border border-dashed px-4 text-sm text-muted-foreground">
                    {t("emptyCost")}
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col">
                    <div
                      className="w-full min-w-0 flex-1"
                      style={{ height: `${chartHeight}px` }}
                    >
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                        initialDimension={{
                          width: BREAKDOWN_CHART_INITIAL_WIDTH,
                          height: chartHeight,
                        }}
                      >
                        <BarChart
                          data={chartData}
                          layout="vertical"
                          margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                          barCategoryGap="20%"
                        >
                          <CartesianGrid
                            horizontal={false}
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) =>
                              formatMetricValue(value, metric, locale)
                            }
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="shortName"
                            width={104}
                            tick={{ fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                            content={(props) => (
                              <BreakdownTooltipContent
                                {...props}
                                metric={metric}
                                locale={locale}
                              />
                            )}
                          />
                          <Bar
                            dataKey="value"
                            radius={[0, 6, 6, 0]}
                            background={{ fill: "var(--muted)" }}
                          >
                            {chartData.map((entry, index) => (
                              <Cell
                                key={entry.key}
                                fill={
                                  metric === "estimatedCostUsd"
                                    ? "var(--chart-2)"
                                    : "var(--chart-1)"
                                }
                                fillOpacity={Math.max(1 - index * 0.14, 0.35)}
                              />
                            ))}
                            <LabelList
                              dataKey="valueLabel"
                              position="right"
                              offset={10}
                              fill="var(--foreground)"
                              fontSize={12}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}
