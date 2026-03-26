import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatTokenCount } from "@/lib/usage/format";
import type { UsageOverviewMetrics } from "@/lib/usage/types";

type KpiGridProps = {
  overview: UsageOverviewMetrics;
};

type KpiConfig = {
  key: keyof UsageOverviewMetrics;
  label: string;
  kind: "tokens" | "duration" | "count";
};

const kpis: KpiConfig[] = [
  { key: "totalTokens", label: "Total Tokens", kind: "tokens" },
  { key: "inputTokens", label: "Input Tokens", kind: "tokens" },
  { key: "outputTokens", label: "Output Tokens", kind: "tokens" },
  { key: "reasoningTokens", label: "Reasoning Tokens", kind: "tokens" },
  { key: "cachedTokens", label: "Cached Tokens", kind: "tokens" },
  { key: "activeSeconds", label: "Active Time", kind: "duration" },
  { key: "totalSeconds", label: "Total Time", kind: "duration" },
  { key: "sessions", label: "Sessions", kind: "count" },
  { key: "messages", label: "Messages", kind: "count" },
  { key: "userMessages", label: "User Messages", kind: "count" },
];

function formatMetricValue(value: number, kind: KpiConfig["kind"]) {
  if (kind === "duration") {
    return formatDuration(value);
  }

  return formatTokenCount(value);
}

function formatDelta(value: number, kind: KpiConfig["kind"]) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatMetricValue(value, kind)}`;
}

export function KpiGrid({ overview }: KpiGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {kpis.map((kpi) => {
        const metric = overview[kpi.key];

        return (
          <Card key={kpi.key} size="sm">
            <CardHeader>
              <CardTitle>{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-semibold tracking-tight">
                {formatMetricValue(metric.current, kpi.kind)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDelta(metric.delta, kpi.kind)} vs previous{" "}
                {formatMetricValue(metric.previous, kpi.kind)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
