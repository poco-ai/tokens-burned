import { NextResponse } from "next/server";

import { getOptionalSession } from "@/lib/session";
import { dashboardQuerySchema } from "@/lib/usage/contracts";
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

function parseDashboardParams(request: Request) {
  const { searchParams } = new URL(request.url);

  return dashboardQuerySchema.safeParse({
    preset: searchParams.get("preset") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    apiKeyId: searchParams.get("apiKeyId") ?? undefined,
    deviceId: searchParams.get("deviceId") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    model: searchParams.get("model") ?? undefined,
    projectKey: searchParams.get("projectKey") ?? undefined,
  });
}

export async function GET(request: Request) {
  const session = await getOptionalSession();

  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const query = parseDashboardParams(request);

  if (!query.success) {
    return NextResponse.json(
      {
        error: "INVALID_QUERY",
        issues: query.error.flatten(),
      },
      { status: 400 },
    );
  }

  const preference = await getUsagePreference(session.user.id);
  const range = resolveDashboardRange({
    preset: query.data.preset,
    from: query.data.from,
    to: query.data.to,
    timezone: preference.timezone,
  });
  const filters = {
    apiKeyId: query.data.apiKeyId,
    deviceId: query.data.deviceId,
    source: query.data.source,
    model: query.data.model,
    projectKey: query.data.projectKey,
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
    getOverviewMetrics({ userId: session.user.id, range, filters }),
    getTokenTrend({ userId: session.user.id, range, filters }),
    getActivityTrend({ userId: session.user.id, range, filters }),
    getHourlyActivityHeatmap({ userId: session.user.id, range, filters }),
    getBreakdowns({ userId: session.user.id, range, filters }),
    getPricingSummaryAndRows({ userId: session.user.id, range, filters }),
    getSessionRows({ userId: session.user.id, range, filters }),
    getLastSyncedAt(session.user.id),
  ]);

  return NextResponse.json({
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      granularity: range.granularity,
      preset: range.preset,
      timezone: range.timezone,
    },
    overview,
    tokenTrend,
    activityTrend,
    hourlyActivityHeatmap,
    breakdowns,
    pricingSummary: pricing.summary,
    modelPricingRows: pricing.modelPricingRows,
    sessions,
    lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
  });
}
