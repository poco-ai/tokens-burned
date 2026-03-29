import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatKpiDelta,
  formatKpiMetricValue,
  type KpiMetricKind,
} from "@/lib/usage/kpi-format";
import type {
  ModelPricingRow,
  UsageOverviewMetrics,
  UsagePricingSummary,
} from "@/lib/usage/types";
import { cn } from "@/lib/utils";
import { AnimatedKpiDelta, AnimatedKpiValue } from "./kpi-animated-metric";
import { PricingMatchDialog } from "./pricing-match-dialog";

type KpiGridProps = {
  overview: UsageOverviewMetrics;
  pricingSummary?: UsagePricingSummary;
  modelPricingRows?: ModelPricingRow[];
};

type SingleKpiConfig = {
  type: "single";
  key: keyof UsageOverviewMetrics | "estimatedCostUsd";
  labelKey: string;
  kind: KpiMetricKind;
};

type CombinedKpiConfig = {
  type: "combined";
  labelKey: string;
  primary: {
    key: keyof UsageOverviewMetrics;
    labelKey: string;
    kind: KpiMetricKind;
  };
  secondary: {
    key: keyof UsageOverviewMetrics;
    labelKey: string;
    kind: KpiMetricKind;
  };
};

type KpiConfig = SingleKpiConfig | CombinedKpiConfig;

const kpis: KpiConfig[] = [
  {
    type: "single",
    key: "estimatedCostUsd",
    labelKey: "estimatedCost",
    kind: "currency",
  },
  {
    type: "single",
    key: "totalTokens",
    labelKey: "totalTokens",
    kind: "tokens",
  },
  {
    type: "single",
    key: "inputTokens",
    labelKey: "inputTokens",
    kind: "tokens",
  },
  {
    type: "combined",
    labelKey: "outputTokens",
    primary: {
      key: "outputTokens",
      labelKey: "outputTokens",
      kind: "tokens",
    },
    secondary: {
      key: "reasoningTokens",
      labelKey: "reasoningTokens",
      kind: "tokens",
    },
  },
  {
    type: "single",
    key: "cachedTokens",
    labelKey: "cachedTokens",
    kind: "tokens",
  },
  {
    type: "single",
    key: "activeSeconds",
    labelKey: "activeTime",
    kind: "duration",
  },
  {
    type: "single",
    key: "totalSeconds",
    labelKey: "totalTime",
    kind: "duration",
  },
  { type: "single", key: "sessions", labelKey: "sessions", kind: "count" },
  { type: "single", key: "messages", labelKey: "messages", kind: "count" },
  {
    type: "single",
    key: "userMessages",
    labelKey: "userMessages",
    kind: "count",
  },
];

type DeltaTone = "positive" | "negative" | "neutral";

function getDeltaTone(value: number): DeltaTone {
  if (value > 0) {
    return "positive";
  }

  if (value < 0) {
    return "negative";
  }

  return "neutral";
}

function getDeltaToneClasses(tone: DeltaTone) {
  switch (tone) {
    case "positive":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "negative":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

type MetricSnapshot = {
  current: number;
  previous: number;
  delta: number;
};

function getMetricSnapshot(
  key: SingleKpiConfig["key"] | keyof UsageOverviewMetrics,
  overview: UsageOverviewMetrics,
  pricingSummary?: UsagePricingSummary,
): MetricSnapshot {
  if (key === "estimatedCostUsd") {
    return {
      current: pricingSummary?.currentUsd ?? 0,
      previous: pricingSummary?.previousUsd ?? 0,
      delta: pricingSummary?.deltaUsd ?? 0,
    };
  }

  return overview[key];
}

function sumMetricSnapshots(
  left: MetricSnapshot,
  right: MetricSnapshot,
): MetricSnapshot {
  return {
    current: left.current + right.current,
    previous: left.previous + right.previous,
    delta: left.delta + right.delta,
  };
}

function DeltaBadge({
  metric,
  kind,
  title,
  compact = false,
}: {
  metric: MetricSnapshot;
  kind: KpiMetricKind;
  title: string;
  compact?: boolean;
}) {
  const deltaTone = getDeltaTone(metric.delta);

  return (
    <>
      <span className="sr-only">{title}</span>
      <span
        data-delta-tone={deltaTone}
        title={title}
        className={cn(
          "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 leading-none font-medium",
          "opacity-0 transition-opacity duration-150 group-hover/card:opacity-100",
          compact ? "text-[0.6rem]" : "text-[0.65rem]",
          getDeltaToneClasses(deltaTone),
        )}
      >
        <AnimatedKpiDelta delta={metric.delta} kind={kind} />
      </span>
    </>
  );
}

export async function KpiGrid({
  overview,
  pricingSummary,
  modelPricingRows = [],
}: KpiGridProps) {
  const t = await getTranslations("usage.kpis");

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {kpis.map((kpi) => {
        if (kpi.type === "combined") {
          const primaryMetric = getMetricSnapshot(
            kpi.primary.key,
            overview,
            pricingSummary,
          );
          const secondaryMetric = getMetricSnapshot(
            kpi.secondary.key,
            overview,
            pricingSummary,
          );
          const combinedMetric = sumMetricSnapshots(
            primaryMetric,
            secondaryMetric,
          );
          const primaryDeltaDescription = t("deltaVsPrevious", {
            delta: formatKpiDelta(combinedMetric.delta, kpi.primary.kind),
            previous: formatKpiMetricValue(
              combinedMetric.previous,
              kpi.primary.kind,
            ),
          });

          return (
            <Card key={kpi.labelKey} size="sm">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{t(kpi.labelKey)}</CardTitle>
                  <DeltaBadge
                    metric={combinedMetric}
                    kind={kpi.primary.kind}
                    title={primaryDeltaDescription}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                  <div className="text-2xl font-semibold tracking-tight">
                    <AnimatedKpiValue
                      kind={kpi.primary.kind}
                      to={combinedMetric.current}
                    />
                  </div>
                  <div className="inline-flex flex-wrap items-baseline gap-x-1 pb-1 text-xs text-muted-foreground">
                    <AnimatedKpiValue
                      kind={kpi.secondary.kind}
                      to={secondaryMetric.current}
                    />
                    <span>{t("reasoningSuffix")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }

        const metric = getMetricSnapshot(kpi.key, overview, pricingSummary);
        const previousValue = formatKpiMetricValue(metric.previous, kpi.kind);
        const deltaDescription = t("deltaVsPrevious", {
          delta: formatKpiDelta(metric.delta, kpi.kind),
          previous: previousValue,
        });
        const isEstimatedCostCard = kpi.key === "estimatedCostUsd";

        return (
          <Card key={kpi.key} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <CardTitle>{t(kpi.labelKey)}</CardTitle>
                  {isEstimatedCostCard ? (
                    <PricingMatchDialog rows={modelPricingRows} />
                  ) : null}
                </div>
                <DeltaBadge
                  metric={metric}
                  kind={kpi.kind}
                  title={deltaDescription}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                <AnimatedKpiValue kind={kpi.kind} to={metric.current} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
