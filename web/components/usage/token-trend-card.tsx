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

function getTooltipRows(point: TokenTrendPoint) {
  return [
    { label: "Total", value: point.totalTokens },
    { label: "Cache", value: point.cachedTokens },
    { label: "Input", value: point.inputTokens },
    { label: "Output", value: point.outputTokens },
  ];
}

export function TokenTrendTooltipContent({
  active,
  label,
  payload,
}: TokenTrendTooltipContentProps) {
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
            key={row.label}
            className="flex items-center justify-between gap-6 text-sm"
          >
            <span className="text-muted-foreground">{row.label}</span>
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
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Daily Trend</CardTitle>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span
              className="size-3 rounded-sm"
              style={{ backgroundColor: "var(--chart-2)" }}
            />
            <span>Cache</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="size-3 rounded-sm"
              style={{ backgroundColor: "var(--chart-3)" }}
            />
            <span>Input</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="size-3 rounded-sm"
              style={{ backgroundColor: "var(--chart-1)" }}
            />
            <span>Output</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
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
                content={(props) => <TokenTrendTooltipContent {...props} />}
              />
              <Bar
                dataKey="cachedTokens"
                name="Cache"
                stackId="tokens"
                fill="var(--chart-2)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="inputTokens"
                name="Input"
                stackId="tokens"
                fill="var(--chart-3)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="outputTokens"
                name="Output"
                stackId="tokens"
                fill="var(--chart-1)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
