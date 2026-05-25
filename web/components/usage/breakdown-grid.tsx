"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTokenCount, formatUsdAmount } from "@/lib/usage/format";
import type { BreakdownRow, UsageBreakdowns } from "@/lib/usage/types";
import { CollapsibleSection } from "./collapsible-section";

const BreakdownChartInner = dynamic(
  () =>
    import("./breakdown-chart-inner").then((mod) => mod.BreakdownChartInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-[196px] w-full animate-pulse rounded-xl bg-muted/50" />
    ),
  },
);

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
  return rows.toSorted((left, right) => {
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

export function BreakdownGrid({
  breakdowns,
  defaultOpen = true,
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
                    <BreakdownChartInner
                      chartData={chartData}
                      chartHeight={chartHeight}
                      metric={metric}
                      locale={locale}
                    />
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
