"use client";

import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatDuration,
  formatTokenCount,
  formatUsdAmount,
} from "@/lib/usage/format";
import type { TokenTrendPoint } from "@/lib/usage/types";
import { TokenTrendTooltipContent } from "./token-trend-card";

type TrendMetricView = "tokens" | "cost" | "totalTime";

type UsageVisualizationChartProps = {
  data: TokenTrendPoint[];
  locale: string;
  view: TrendMetricView;
};

const TREND_INITIAL_DIMENSION = {
  width: 1120,
  height: 352,
} as const;

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

export function UsageVisualizationChart({
  data,
  locale,
  view,
}: UsageVisualizationChartProps) {
  const tTrend = useTranslations("usage.trend");

  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      initialDimension={TREND_INITIAL_DIMENSION}
    >
      <BarChart
        data={data}
        margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
        barGap={0}
        barCategoryGap="8%"
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" minTickGap={24} tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => formatTrendAxisValue(value, view, locale)}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.45 }}
          content={(props) => (
            <TokenTrendTooltipContent {...props} view={view} locale={locale} />
          )}
        />
        {view === "tokens" ? (
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
        ) : view === "cost" ? (
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
  );
}
