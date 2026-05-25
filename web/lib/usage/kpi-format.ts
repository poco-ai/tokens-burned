import {
  formatDuration,
  formatTokenCount,
  formatUsdAmount,
} from "@/lib/usage/format";

export type KpiMetricKind = "tokens" | "duration" | "count" | "currency";

function normalizeKpiDisplayValue(value: number, kind: KpiMetricKind): number {
  if (kind === "currency") {
    return Math.round(value * 100) / 100;
  }
  return Math.round(value);
}

export function formatKpiMetricValue(
  value: number,
  kind: KpiMetricKind,
  options?: { compact?: boolean },
) {
  const v = normalizeKpiDisplayValue(value, kind);

  if (kind === "currency") {
    return formatUsdAmount(v, "en", options);
  }

  if (kind === "duration") {
    return formatDuration(v, options);
  }

  return formatTokenCount(v);
}

export function formatKpiDelta(value: number, kind: KpiMetricKind) {
  const v = normalizeKpiDisplayValue(value, kind);
  const prefix = v > 0 ? "+" : "";
  return `${prefix}${formatKpiMetricValue(v, kind, { compact: true })}`;
}
