import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/app/app-shell";
import { ProfileHeatmap } from "@/components/social/profile-heatmap";
import { ProfileHeatmapMarkdownButton } from "@/components/social/profile-heatmap-markdown-button";
import { ShareBadgesDialog } from "@/components/social/share-badges-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BreakdownGrid } from "@/components/usage/breakdown-grid";
import { EmptyState } from "@/components/usage/empty-state";
import { FiltersBar } from "@/components/usage/filters-bar";
import { HourlyActivityHeatmapCard } from "@/components/usage/hourly-activity-heatmap-card";
import { KpiGrid } from "@/components/usage/kpi-grid";
import { UsagePageShell } from "@/components/usage/page-shell";
import { SessionsSection } from "@/components/usage/sessions-section";
import { TokenTrendCard } from "@/components/usage/token-trend-card";
import { Link } from "@/i18n/navigation";
import { redirectIfUsernameSetupNeeded } from "@/lib/account-setup";
import { getSessionOrRedirect } from "@/lib/session";
import { getAppOrigin } from "@/lib/site-url";
import { buildActivitySvgUrl } from "@/lib/social/heatmap-svg";
import { getActivityHeatmap365 } from "@/lib/social/queries";
import { dashboardQuerySchema } from "@/lib/usage/contracts";
import { resolveDashboardRange } from "@/lib/usage/date-range";
import { formatDateTime } from "@/lib/usage/format";
import { getUsagePreference } from "@/lib/usage/preferences";
import {
  getBreakdowns,
  getFilterOptions,
  getHourlyActivityHeatmap,
  getLastSyncedAt,
  getOverviewMetrics,
  getPricingSummaryAndRows,
  getSessionRows,
  getTokenTrend,
} from "@/lib/usage/queries";
import {
  SETTINGS_CLI_KEYS_HREF,
  settingsCliKeysHrefWithCreateDialog,
} from "@/lib/usage/settings-routes";
import type { UsageFilters } from "@/lib/usage/types";

type UsagePageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "usage" });

  return {
    title: `${t("overviewTitle")} | Token Arena`,
  };
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveQueryParams(
  params: Record<string, string | string[] | undefined>,
  locale: string,
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
    redirect(`/${locale}/usage`);
  }

  return parsed.data;
}

export default async function UsagePage({
  params,
  searchParams,
}: UsagePageProps) {
  const { locale } = await params;
  const session = await getSessionOrRedirect(locale);
  redirectIfUsernameSetupNeeded(locale, session.user);
  const t = await getTranslations({ locale, namespace: "usage" });
  const tProfile = await getTranslations({
    locale,
    namespace: "social.profile",
  });
  const resolvedSearchParams = (searchParams ? await searchParams : {}) ?? {};
  const query = resolveQueryParams(resolvedSearchParams, locale);
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

  const [
    overview,
    tokenTrend,
    hourlyActivityHeatmap,
    breakdowns,
    pricing,
    sessions,
    filterOptions,
    lastSyncedAt,
    activityHeatmap,
  ] = await Promise.all([
    getOverviewMetrics({ userId: session.user.id, range, filters }),
    getTokenTrend({ userId: session.user.id, range, filters }),
    getHourlyActivityHeatmap({ userId: session.user.id, range, filters }),
    getBreakdowns({ userId: session.user.id, range, filters }),
    getPricingSummaryAndRows({ userId: session.user.id, range, filters }),
    getSessionRows({ userId: session.user.id, range, filters }),
    getFilterOptions(session.user.id),
    getLastSyncedAt(session.user.id),
    getActivityHeatmap365({
      userId: session.user.id,
      timezone: preference.timezone,
    }),
  ]);

  const hasData =
    overview.totalTokens.current > 0 || overview.sessions.current > 0;
  const lastSyncedText = lastSyncedAt
    ? t("lastSynced", {
        value: formatDateTime(lastSyncedAt, preference.timezone, locale),
      })
    : t("noSyncYet");
  const hasKeys = filterOptions.apiKeys.length > 0;
  const appUrl = getAppOrigin() ?? "http://localhost:3000";
  const compactSvgUrl =
    preference.publicProfileEnabled && session.user.username
      ? buildActivitySvgUrl({
          baseUrl: appUrl,
          locale,
          username: session.user.username,
        })
      : null;
  const heatmapMarkdown = compactSvgUrl
    ? `![TokenArena Activity](${compactSvgUrl})`
    : null;

  return (
    <AppShell
      locale={locale}
      viewer={{
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        username: session.user.username,
        usernameAutoAdjusted: session.user.usernameAutoAdjusted,
      }}
    >
      <UsagePageShell>
        <div className="space-y-4">
          <Card className="bg-card shadow-sm ring-1 ring-border/60">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border/50 pb-3 sm:px-6">
              <div className="min-w-0">
                <CardTitle>{tProfile("activityTitle")}</CardTitle>
              </div>
              {heatmapMarkdown ? (
                <div className="shrink-0">
                  <ProfileHeatmapMarkdownButton markdown={heatmapMarkdown} />
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-center gap-4 pt-4 sm:px-6">
              <ProfileHeatmap
                locale={locale}
                days={activityHeatmap}
                lessLabel={tProfile("less")}
                moreLabel={tProfile("more")}
              />
            </CardContent>
          </Card>

          <FiltersBar
            preset={range.preset}
            range={{
              from: range.from.toISOString(),
              to: range.to.toISOString(),
              timezone: range.timezone,
            }}
            filters={filters}
            options={filterOptions}
            lastSyncedText={lastSyncedText}
            badgesSlot={
              <ShareBadgesDialog
                username={session.user.username}
                publicProfileEnabled={preference.publicProfileEnabled}
                appUrl={appUrl}
              />
            }
          />

          {hasData ? (
            <>
              <div className="grid gap-4 xl:grid-cols-2">
                <TokenTrendCard data={tokenTrend} />
                <HourlyActivityHeatmapCard data={hourlyActivityHeatmap} />
              </div>
              <KpiGrid
                overview={overview}
                pricingSummary={pricing.summary}
                modelPricingRows={pricing.modelPricingRows}
              />
              <BreakdownGrid breakdowns={breakdowns} />
              <SessionsSection
                sessions={sessions}
                timezone={preference.timezone}
              />
            </>
          ) : (
            <EmptyState
              step1Action={
                <Button asChild size="default" type="button">
                  <Link
                    href={
                      hasKeys
                        ? SETTINGS_CLI_KEYS_HREF
                        : settingsCliKeysHrefWithCreateDialog()
                    }
                  >
                    {t("emptyState.createFirstKey")}
                  </Link>
                </Button>
              }
            />
          )}
        </div>
      </UsagePageShell>
    </AppShell>
  );
}
