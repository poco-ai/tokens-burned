import { NextResponse } from "next/server";

import { getOptionalSession } from "@/lib/session";
import { dashboardQuerySchema } from "@/lib/usage/contracts";
import { getUsageDashboardData } from "@/lib/usage/dashboard.server";

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

  const { dashboard } = await getUsageDashboardData({
    userId: session.user.id,
    query: query.data,
  });

  return NextResponse.json({
    range: {
      from: dashboard.range.from.toISOString(),
      to: dashboard.range.to.toISOString(),
      granularity: dashboard.range.granularity,
      preset: dashboard.range.preset,
      timezone: dashboard.range.timezone,
    },
    overview: dashboard.overview,
    tokenTrend: dashboard.tokenTrend,
    activityTrend: dashboard.activityTrend,
    hourlyActivityHeatmap: dashboard.hourlyActivityHeatmap,
    breakdowns: dashboard.breakdowns,
    pricingSummary: dashboard.pricingSummary,
    modelPricingRows: dashboard.modelPricingRows,
    sessions: dashboard.sessions,
    lastSyncedAt: dashboard.lastSyncedAt?.toISOString() ?? null,
  });
}
