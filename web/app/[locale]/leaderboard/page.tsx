import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LeaderboardMetricSelect } from "@/components/social/leaderboard-metric-select";
import { LeaderboardPublicProfileButton } from "@/components/social/leaderboard-private-notice";
import { LeaderboardTable } from "@/components/social/leaderboard-table";
import { LeaderboardWindowBadge } from "@/components/social/leaderboard-window-badge";
import { SocialShell } from "@/components/social/social-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import {
  leaderboardMetricSchema,
  leaderboardPeriodSchema,
} from "@/lib/leaderboard/contracts";
import { getLeaderboardPageData } from "@/lib/leaderboard/queries";
import {
  defaultLeaderboardMetric,
  type LeaderboardMetric,
  type LeaderboardPeriod,
} from "@/lib/leaderboard/types";
import { getOptionalSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type LeaderboardPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolvePeriod(value: string | undefined): LeaderboardPeriod {
  const parsed = leaderboardPeriodSchema.safeParse(value);
  return parsed.success ? parsed.data : "week";
}

function resolveMetric(value: string | undefined): LeaderboardMetric {
  const parsed = leaderboardMetricSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultLeaderboardMetric;
}

function buildLeaderboardQuery(input: {
  period: LeaderboardPeriod;
  metric: LeaderboardMetric;
}) {
  return {
    period: input.period,
    ...(input.metric === defaultLeaderboardMetric
      ? {}
      : {
          metric: input.metric,
        }),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "social.nav" });

  return {
    title: `${t("leaderboard")} | Token Arena`,
  };
}

export default async function LeaderboardPage({
  params,
  searchParams,
}: LeaderboardPageProps) {
  const { locale } = await params;
  const viewer = await getOptionalSession();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const period = resolvePeriod(firstValue(resolvedSearchParams?.period));
  const metric = resolveMetric(firstValue(resolvedSearchParams?.metric));
  const data = await getLeaderboardPageData({
    period,
    metric,
    viewerUserId: viewer?.user.id ?? null,
    followTag: "all",
  });
  const t = await getTranslations({ locale, namespace: "social.leaderboard" });
  const tCard = await getTranslations({ locale, namespace: "social.card" });
  const tNav = await getTranslations({ locale, namespace: "social.nav" });

  const periodItems: Array<{ value: LeaderboardPeriod; label: string }> = [
    { value: "day", label: t("periods.day") },
    { value: "week", label: t("periods.week") },
    { value: "month", label: t("periods.month") },
    { value: "all_time", label: t("periods.allTime") },
  ];
  const metricItems: Array<{ value: LeaderboardMetric; label: string }> = [
    { value: "total_tokens", label: t("metrics.totalTokens") },
    { value: "estimated_cost", label: t("metrics.estimatedCost") },
  ];

  return (
    <SocialShell
      locale={locale}
      viewer={
        viewer
          ? {
              id: viewer.user.id,
              email: viewer.user.email,
              name: viewer.user.name,
              image: viewer.user.image,
              username: viewer.user.username,
            }
          : null
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {periodItems.map((item) => (
              <Link
                key={item.value}
                href={{
                  pathname: "/leaderboard",
                  query: buildLeaderboardQuery({
                    period: item.value,
                    metric,
                  }),
                }}
                aria-current={period === item.value ? "page" : undefined}
                className={cn(
                  "inline-flex items-center border-b-2 border-transparent py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  period === item.value && "border-foreground text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <LeaderboardMetricSelect
              value={metric}
              defaultValue={defaultLeaderboardMetric}
              ariaLabel={t("metricSelectLabel")}
              options={metricItems}
            />
          </div>
        </div>
        <LeaderboardTable
          locale={locale}
          title={t("globalTitle")}
          headerRight={
            <LeaderboardWindowBadge
              locale={locale}
              period={period}
              windowStart={data.global.windowStart}
              windowEnd={data.global.windowEnd}
            />
          }
          emptyLabel={t("emptyGlobal")}
          entries={data.global.entries}
          viewerEntry={data.viewerGlobalEntry}
          viewerNotice={
            viewer && data.viewerPublicProfileEnabled === false
              ? {
                  name: viewer.user.name,
                  username: viewer.user.username,
                  message: t("privateRankUnavailable"),
                  action: <LeaderboardPublicProfileButton />,
                }
              : null
          }
          labels={{
            rank: t("table.rank"),
            user: t("table.user"),
            totalTokens: t("table.totalTokens"),
            estimatedCost: t("table.estimatedCost"),
            activeTime: t("table.activeTime"),
            sessions: t("table.sessions"),
            followers: t("table.followers"),
            mutual: tCard("mutual"),
            you: tCard("you"),
          }}
        />

        {data.following ? (
          <LeaderboardTable
            locale={locale}
            title={t("followingTitle")}
            headerRight={
              <LeaderboardWindowBadge
                locale={locale}
                period={period}
                windowStart={data.following.windowStart}
                windowEnd={data.following.windowEnd}
              />
            }
            emptyLabel={t("emptyFollowing")}
            emptyPlain
            entries={data.following.entries}
            labels={{
              rank: t("table.rank"),
              user: t("table.user"),
              totalTokens: t("table.totalTokens"),
              estimatedCost: t("table.estimatedCost"),
              activeTime: t("table.activeTime"),
              sessions: t("table.sessions"),
              followers: t("table.followers"),
              mutual: tCard("mutual"),
              you: tCard("you"),
            }}
          />
        ) : (
          <Card className="shadow-sm ring-1 ring-border/60">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="font-medium">{t("signInTitle")}</div>
                <p className="text-sm text-muted-foreground">
                  {t("signInDescription")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild type="button" variant="outline" size="sm">
                  <Link href="/login">{tNav("signIn")}</Link>
                </Button>
                <Button asChild type="button" size="sm">
                  <Link href="/register">{tNav("register")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SocialShell>
  );
}
