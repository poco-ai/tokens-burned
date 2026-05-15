"use client";

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

import {
  formatDuration,
  formatPercentage,
  formatTokenCount,
  formatUsdAmount,
} from "@/lib/usage/format";

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

type BreakdownMetric = "estimatedCostUsd" | "totalTokens";

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

type BreakdownTooltipContentProps = {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload?: BreakdownChartDatum;
  }>;
  metric: BreakdownMetric;
  locale: string;
};

function getMetricLabelKey(metric: BreakdownMetric) {
  switch (metric) {
    case "estimatedCostUsd":
      return "estimatedCost";
    case "totalTokens":
      return "totalTokens";
  }
}

function BreakdownTooltipContent({
  active,
  payload,
  metric,
  locale,
}: BreakdownTooltipContentProps) {
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
            {getMetricLabelKey(metric)}
          </span>
          <span className="font-medium text-foreground">
            {formatMetricValue(point.value, metric, locale)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="text-muted-foreground">share</span>
          <span className="font-medium text-foreground">
            {formatPercentage(point.share, locale)}
          </span>
        </div>
        {metric !== "totalTokens" ? (
          <div className="flex items-center justify-between gap-6 text-sm">
            <span className="text-muted-foreground">totalTokens</span>
            <span className="font-medium text-foreground">
              {formatTokenCount(point.totalTokens)}
            </span>
          </div>
        ) : null}
        {metric !== "estimatedCostUsd" ? (
          <div className="flex items-center justify-between gap-6 text-sm">
            <span className="text-muted-foreground">estimatedCost</span>
            <span className="font-medium text-foreground">
              {formatUsdAmount(point.estimatedCostUsd, locale)}
            </span>
          </div>
        ) : null}
        {point.totalSeconds > 0 ? (
          <div className="flex items-center justify-between gap-6 text-sm">
            <span className="text-muted-foreground">totalTime</span>
            <span className="font-medium text-foreground">
              {formatDuration(point.totalSeconds)}
            </span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="text-muted-foreground">sessions</span>
          <span className="font-medium text-foreground">
            {formatTokenCount(point.sessions)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="text-muted-foreground">messages</span>
          <span className="font-medium text-foreground">
            {formatTokenCount(point.messages)}
          </span>
        </div>
      </div>
    </div>
  );
}

type BreakdownChartInnerProps = {
  chartData: BreakdownChartDatum[];
  chartHeight: number;
  metric: BreakdownMetric;
  locale: string;
};

export function BreakdownChartInner({
  chartData,
  chartHeight,
  metric,
  locale,
}: BreakdownChartInnerProps) {
  return (
    <div
      className="w-full min-w-0 flex-1"
      style={{ height: `${chartHeight}px` }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{
          width: 720,
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
            tickFormatter={(value) => formatMetricValue(value, metric, locale)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="key"
            width={104}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: string) => {
              const entry = chartData.find((row) => row.key === value);
              return entry?.shortName ?? value;
            }}
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
            background={{ fill: "var(--card)" }}
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
  );
}
