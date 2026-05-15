"use client";

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

const TOKEN_TREND_INITIAL_DIMENSION = {
  width: 720,
  height: 288,
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

type TokenTrendChartInnerProps = {
  data: TokenTrendPoint[];
  metricView: TrendMetricView;
  locale: string;
  t: (key: string) => string;
};

export function TokenTrendChartInner({
  data,
  metricView,
  locale,
  t,
}: TokenTrendChartInnerProps) {
  return (
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
        <XAxis dataKey="label" minTickGap={24} tick={{ fontSize: 12 }} />
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
  );
}
