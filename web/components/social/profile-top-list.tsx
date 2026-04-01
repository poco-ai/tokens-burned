"use client";

import { useTranslations } from "next-intl";
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

import { formatPercentage, formatTokenCount } from "@/lib/usage/format";

type ProfileTopListProps = {
  locale: string;
  emptyLabel: string;
  items: Array<{
    name: string;
    totalTokens: number;
    share: number;
  }>;
};

type ChartDatum = {
  name: string;
  shortName: string;
  value: number;
  valueLabel: string;
  share: number;
};

type ProfileTopTooltipContentProps = {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload?: ChartDatum;
  }>;
  locale: string;
  shareLabel: string;
  tokenLabel: string;
};

const PROFILE_TOP_LIST_INITIAL_WIDTH = 720;

function truncateLabel(value: string, maxLength = 14) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function toChartData(items: ProfileTopListProps["items"]): ChartDatum[] {
  return items.map((item) => ({
    name: item.name,
    shortName: truncateLabel(item.name),
    value: item.totalTokens,
    valueLabel: formatTokenCount(item.totalTokens),
    share: item.share,
  }));
}

function ProfileTopTooltipContent({
  active,
  payload,
  locale,
  shareLabel,
  tokenLabel,
}: ProfileTopTooltipContentProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="min-w-44 rounded-lg border bg-card p-3 shadow-md">
      <div className="mb-3 text-sm font-medium text-foreground">
        {point.name}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="text-muted-foreground">{tokenLabel}</span>
          <span className="font-medium text-foreground">
            {point.valueLabel}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="text-muted-foreground">{shareLabel}</span>
          <span className="font-medium text-foreground">
            {formatPercentage(point.share, locale)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProfileTopList({
  locale,
  emptyLabel,
  items,
}: ProfileTopListProps) {
  const tProfile = useTranslations("social.profile");
  const tTable = useTranslations("usage.breakdowns.table");

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const chartData = toChartData(items);
  const chartHeight = Math.max(chartData.length * 44 + 24, 220);

  return (
    <div
      className="h-[220px] w-full min-w-0"
      style={{ height: `${chartHeight}px` }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{
          width: PROFILE_TOP_LIST_INITIAL_WIDTH,
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
            tickFormatter={(value) => formatTokenCount(Number(value))}
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
            content={(tooltipProps) => (
              <ProfileTopTooltipContent
                {...tooltipProps}
                locale={locale}
                shareLabel={tTable("share")}
                tokenLabel={tProfile("totalTokens")}
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
                key={entry.name}
                fill="var(--chart-1)"
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
