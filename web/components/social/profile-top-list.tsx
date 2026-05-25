"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { formatTokenCount } from "@/lib/usage/format";

const ProfileTopListChartInner = dynamic(
  () =>
    import("./profile-top-list-chart-inner").then(
      (mod) => mod.ProfileTopListChartInner,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] w-full animate-pulse rounded-xl bg-muted/50" />
    ),
  },
);

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
    <ProfileTopListChartInner
      chartData={chartData}
      chartHeight={chartHeight}
      locale={locale}
      shareLabel={tTable("share")}
      tokenLabel={tProfile("totalTokens")}
    />
  );
}
