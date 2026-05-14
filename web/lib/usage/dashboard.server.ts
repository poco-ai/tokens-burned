import "server-only";

import type { z } from "zod";
import type { dashboardQuerySchema } from "@/lib/usage/contracts";
import { resolveDashboardRange } from "@/lib/usage/date-range";
import { getUsagePreference } from "@/lib/usage/preferences";
import {
  getActivityTrend,
  getBreakdowns,
  getHourlyActivityHeatmap,
  getLastSyncedAt,
  getOverviewMetrics,
  getPricingSummaryAndRows,
  getSessionRows,
  getTokenTrend,
} from "@/lib/usage/queries";
import type {
  ActivityTrendPoint,
  DashboardRange,
  HourlyActivityHeatmapCell,
  ModelPricingRow,
  TokenTrendPoint,
  UsageBreakdowns,
  UsageFilters,
  UsageOverviewMetrics,
  UsagePricingSummary,
  UsageSessionRow,
} from "@/lib/usage/types";

export type UsageDashboardQuery = z.infer<typeof dashboardQuerySchema>;

export type UsageDashboardData = {
  range: DashboardRange;
  filters: UsageFilters;
  overview: UsageOverviewMetrics;
  tokenTrend: TokenTrendPoint[];
  activityTrend: ActivityTrendPoint[];
  hourlyActivityHeatmap: HourlyActivityHeatmapCell[];
  breakdowns: UsageBreakdowns;
  pricingSummary: UsagePricingSummary;
  modelPricingRows: ModelPricingRow[];
  sessions: UsageSessionRow[];
  lastSyncedAt: Date | null;
};

export async function getUsageDashboardData(input: {
  userId: string;
  query: UsageDashboardQuery;
}) {
  const preference = await getUsagePreference(input.userId);
  const range = resolveDashboardRange({
    preset: input.query.preset,
    from: input.query.from,
    to: input.query.to,
    timezone: preference.timezone,
  });
  const filters: UsageFilters = {
    apiKeyId: input.query.apiKeyId,
    deviceId: input.query.deviceId,
    source: input.query.source,
    model: input.query.model,
    projectKey: input.query.projectKey,
  };

  const [
    overview,
    tokenTrend,
    activityTrend,
    hourlyActivityHeatmap,
    breakdowns,
    pricing,
    sessions,
    lastSyncedAt,
  ] = await Promise.all([
    getOverviewMetrics({ userId: input.userId, range, filters }),
    getTokenTrend({ userId: input.userId, range, filters }),
    getActivityTrend({ userId: input.userId, range, filters }),
    getHourlyActivityHeatmap({ userId: input.userId, range, filters }),
    getBreakdowns({ userId: input.userId, range, filters }),
    getPricingSummaryAndRows({ userId: input.userId, range, filters }),
    getSessionRows({ userId: input.userId, range, filters }),
    getLastSyncedAt(input.userId),
  ]);

  const dashboard: UsageDashboardData = {
    range,
    filters,
    overview,
    tokenTrend,
    activityTrend,
    hourlyActivityHeatmap,
    breakdowns,
    pricingSummary: pricing.summary,
    modelPricingRows: pricing.modelPricingRows,
    sessions,
    lastSyncedAt,
  };

  return { dashboard, preference };
}
