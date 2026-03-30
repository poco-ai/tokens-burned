import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LeaderboardMetricSelect } from "@/components/social/leaderboard-metric-select";
import { LeaderboardTable } from "@/components/social/leaderboard-table";
import { LeaderboardTagSelect } from "@/components/social/leaderboard-tag-select";
import { SocialShell } from "@/components/social/social-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import {
  leaderboardMetricSchema,
  leaderboardPeriodSchema,
  leaderboardTagFilterSchema,
} from "@/lib/leaderboard/contracts";
import { getLeaderboardPageData } from "@/lib/leaderboard/queries";
import {
  defaultLeaderboardMetric,
  type LeaderboardMetric,
  type LeaderboardPeriod,
} from "@/lib/leaderboard/types";
import { getOptionalSession } from "@/lib/session";
import { type FollowTagFilter, followTags } from "@/lib/social/follow-tags";
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

function resolveTag(value: string | undefined): FollowTagFilter {
  const parsed = leaderboardTagFilterSchema.safeParse(value);
  return parsed.success ? parsed.data : "all";
}

function buildLeaderboardQuery(input: {
  period: LeaderboardPeriod;
  metric: LeaderboardMetric;
  tag: FollowTagFilter;
}) {
  return {
    period: input.period,
    ...(input.metric === defaultLeaderboardMetric
      ? {}
      : {
          metric: input.metric,
        }),
    ...(input.tag === "all"
      ? {}
      : {
          tag: input.tag,
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
  const followTag = viewer
    ? resolveTag(firstValue(resolvedSearchParams?.tag))
    : "all";
  const data = await getLeaderboardPageData({
    period,
    metric,
    viewerUserId: viewer?.user.id ?? null,
    followTag,
  });
  const t = await getTranslations({ locale, namespace: "social.leaderboard" });
  const tCard = await getTranslations({ locale, namespace: "social.card" });
  const tNav = await getTranslations({ locale, namespace: "social.nav" });
  const tTags = await getTranslations({ locale, namespace: "social.tags" });

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
  const tagItems: Array<{ value: FollowTagFilter; label: string }> = [
    { value: "all", label: tTags("all") },
    ...followTags.map((value) => ({
      value,
      label: tTags(`options.${value}`),
    })),
  ];
  const followingTitle =
    followTag === "all"
      ? t("followingTitle")
      : t("followingTitleFiltered", {
          tag: tTags(`options.${followTag}`),
        });
  const followingEmptyLabel =
    followTag === "all"
      ? t("emptyFollowing")
      : t("emptyFollowingFiltered", {
          tag: tTags(`options.${followTag}`),
        });

  const viewerSummary =
    viewer && data.viewerPublicProfileEnabled === false ? (
      <Card className="border-dashed shadow-sm ring-1 ring-border/60">
        <CardContent className="space-y-3 py-1">
          <div className="text-sm font-medium">{t("privateNoticeTitle")}</div>
          <p className="text-sm text-muted-foreground">
            {t("privateNoticeDescription")}
          </p>
          <Button asChild type="button" size="sm" variant="outline">
            <Link href="/usage">{t("openDashboard")}</Link>
          </Button>
        </CardContent>
      </Card>
    ) : null;

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
                    tag: followTag,
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
          <div className="flex flex-col gap-2 sm:flex-row">
            {viewer ? (
              <LeaderboardTagSelect
                value={followTag}
                defaultValue="all"
                ariaLabel={tTags("filterLabel")}
                options={tagItems}
              />
            ) : null}
            <LeaderboardMetricSelect
              value={metric}
              defaultValue={defaultLeaderboardMetric}
              ariaLabel={t("metricSelectLabel")}
              options={metricItems}
            />
          </div>
        </div>

        {viewerSummary}

        <LeaderboardTable
          locale={locale}
          title={t("globalTitle")}
          emptyLabel={t("emptyGlobal")}
          entries={data.global.entries}
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
            viewProfile: tCard("viewProfile"),
          }}
        />

        {data.following ? (
          <LeaderboardTable
            locale={locale}
            title={followingTitle}
            emptyLabel={followingEmptyLabel}
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
              viewProfile: tCard("viewProfile"),
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
