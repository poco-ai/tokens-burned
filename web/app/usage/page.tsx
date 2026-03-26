import { redirect } from "next/navigation";

import { AccountMenu } from "@/components/usage/account-menu";
import { BreakdownTabs } from "@/components/usage/breakdown-tabs";
import { EmptyState } from "@/components/usage/empty-state";
import { FiltersBar } from "@/components/usage/filters-bar";
import { KpiGrid } from "@/components/usage/kpi-grid";
import { UsagePageShell } from "@/components/usage/page-shell";
import { SettingsDialog } from "@/components/usage/settings-dialog";
import { TokenTrendCard } from "@/components/usage/token-trend-card";
import { getSessionOrRedirect } from "@/lib/session";
import { listUsageApiKeys } from "@/lib/usage/api-keys";
import { dashboardQuerySchema } from "@/lib/usage/contracts";
import { resolveDashboardRange } from "@/lib/usage/date-range";
import { formatDateTime } from "@/lib/usage/format";
import { getUsagePreference } from "@/lib/usage/preferences";
import {
  getBreakdowns,
  getFilterOptions,
  getLastSyncedAt,
  getOverviewMetrics,
  getTokenTrend,
} from "@/lib/usage/queries";
import type { UsageFilters } from "@/lib/usage/types";

type UsagePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveQueryParams(
  params: Record<string, string | string[] | undefined>,
) {
  const parsed = dashboardQuerySchema.safeParse({
    preset: firstValue(params.preset),
    from: firstValue(params.from),
    to: firstValue(params.to),
    apiKeyId: firstValue(params.apiKeyId),
    deviceId: firstValue(params.deviceId),
    source: firstValue(params.source),
    model: firstValue(params.model),
    projectKey: firstValue(params.projectKey),
  });

  if (!parsed.success) {
    redirect("/usage");
  }

  return parsed.data;
}

export default async function UsagePage({ searchParams }: UsagePageProps) {
  const session = await getSessionOrRedirect();
  const resolvedSearchParams = (searchParams ? await searchParams : {}) ?? {};
  const query = resolveQueryParams(resolvedSearchParams);
  const preference = await getUsagePreference(session.user.id);
  const range = resolveDashboardRange({
    preset: query.preset,
    from: query.from,
    to: query.to,
    timezone: preference.timezone,
  });
  const filters: UsageFilters = {
    apiKeyId: query.apiKeyId,
    deviceId: query.deviceId,
    source: query.source,
    model: query.model,
    projectKey: query.projectKey,
  };

  const [overview, tokenTrend, breakdowns, filterOptions, lastSyncedAt, keys] =
    await Promise.all([
      getOverviewMetrics({ userId: session.user.id, range, filters }),
      getTokenTrend({ userId: session.user.id, range, filters }),
      getBreakdowns({ userId: session.user.id, range, filters }),
      getFilterOptions(session.user.id),
      getLastSyncedAt(session.user.id),
      listUsageApiKeys(session.user.id),
    ]);

  const hasData =
    overview.totalTokens.current > 0 || overview.sessions.current > 0;
  const lastSyncedLabel = lastSyncedAt
    ? formatDateTime(lastSyncedAt, preference.timezone)
    : "No sync yet";

  return (
    <UsagePageShell
      title="Overview"
      lastSyncedLabel={lastSyncedLabel}
      headerActions={
        <>
          <SettingsDialog
            initialTimezone={preference.timezone}
            initialProjectMode={preference.projectMode}
            initialKeys={keys.map((key) => ({
              id: key.id,
              name: key.name,
              prefix: key.prefix,
              status: key.status,
              lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
              createdAt: key.createdAt.toISOString(),
            }))}
          />
          <AccountMenu email={session.user.email} />
        </>
      }
    >
      <div className="space-y-4">
        <FiltersBar
          preset={range.preset}
          range={{
            from: range.from.toISOString(),
            to: range.to.toISOString(),
            timezone: range.timezone,
          }}
          filters={filters}
          options={filterOptions}
        />

        {hasData ? (
          <>
            <KpiGrid overview={overview} />
            <TokenTrendCard data={tokenTrend} />
            <BreakdownTabs breakdowns={breakdowns} />
          </>
        ) : (
          <EmptyState hasKeys={filterOptions.apiKeys.length > 0} />
        )}
      </div>
    </UsagePageShell>
  );
}
