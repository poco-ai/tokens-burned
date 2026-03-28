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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTokenCount } from "@/lib/usage/format";
import type { TokenTrendPoint } from "@/lib/usage/types";

type TokenTrendCardProps = {
  data: TokenTrendPoint[];
};

type TokenTrendTooltipContentProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{
    payload?: TokenTrendPoint;
  }>;
};

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
} as const;

type TokenTrendTooltipLabelKey = keyof typeof TOKEN_TREND_TOOLTIP_STYLES;

type TokenTrendTooltipRow = {
  labelKey: TokenTrendTooltipLabelKey;
  value: number;
};

function getTooltipRows(point: TokenTrendPoint): TokenTrendTooltipRow[] {
  return [
    { labelKey: "total", value: point.totalTokens },
    { labelKey: "cache", value: point.cachedTokens },
    { labelKey: "input", value: point.inputTokens },
    { labelKey: "output", value: point.outputTokens },
  ];
}

export function TokenTrendTooltipContent({
  active,
  label,
  payload,
}: TokenTrendTooltipContentProps) {
  const t = useTranslations("usage.trend");
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="min-w-44 rounded-lg border bg-background/95 p-3 shadow-md">
      <div className="mb-3 text-sm font-medium text-foreground">
        {String(label ?? point.label)}
      </div>
      <div className="space-y-1.5">
        {getTooltipRows(point).map((row) => (
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
              {formatTokenCount(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TokenTrendCard({ data }: TokenTrendCardProps) {
  const t = useTranslations("usage.trend");

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{t("title")}</CardTitle>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
      </CardHeader>
      <CardContent>
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
              <XAxis dataKey="label" minTickGap={24} tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatTokenCount} tick={{ fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                content={(props) => <TokenTrendTooltipContent {...props} />}
              />
              {TOKEN_TREND_SERIES.map((series) => (
                <Bar
                  key={series.dataKey}
                  dataKey={series.dataKey}
                  name={t(series.labelKey)}
                  stackId="tokens"
                  fill={series.color}
                  fillOpacity={series.opacity}
                  radius={series.radius}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
