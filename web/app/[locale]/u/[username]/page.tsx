import { Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProfileAchievementWall } from "@/components/social/profile-achievement-wall";
import { ProfileArenaLevelBar } from "@/components/social/profile-arena-level";
import { ProfileFollowAction } from "@/components/social/profile-follow-action";
import { ProfileHeatmap } from "@/components/social/profile-heatmap";
import { ProfileTopList } from "@/components/social/profile-top-list";
import { SocialShell } from "@/components/social/social-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getOptionalSession } from "@/lib/session";
import { getPublicProfilePageData } from "@/lib/social/queries";
import {
  formatDuration,
  formatTokenCount,
  formatUsdAmount,
} from "@/lib/usage/format";

type PublicProfilePageProps = {
  params: Promise<{
    locale: string;
    username: string;
  }>;
};

function formatJoinedDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
  }).format(value);
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;

  return {
    title: `@${username} | Token Arena`,
  };
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { locale, username } = await params;
  const viewer = await getOptionalSession();
  const t = await getTranslations({ locale, namespace: "social.profile" });
  const profile = await getPublicProfilePageData({
    username,
    viewerUserId: viewer?.user.id ?? null,
  });

  if (!profile) {
    notFound();
  }

  const hasActivity = profile.heatmap.some((day) => day.activeSeconds > 0);

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
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="min-w-0">
          <Card className="bg-card shadow-sm ring-1 ring-border/60">
            <CardContent className="space-y-4 py-4">
              <div className="space-y-3">
                {profile.image ? (
                  /* biome-ignore lint/performance/noImgElement: user avatars may come from arbitrary remote URLs */
                  <img
                    src={profile.image}
                    alt={profile.name}
                    className="size-24 rounded-full border border-border/60 object-cover"
                  />
                ) : (
                  <div className="inline-flex size-24 items-center justify-center rounded-full border border-border/60 bg-muted text-3xl font-semibold text-foreground">
                    {getInitial(profile.username)}
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h1 className="text-xl font-semibold tracking-tight">
                      {profile.name}
                    </h1>
                    {!profile.publicProfileEnabled ? (
                      <Badge variant="outline">{t("privateBadge")}</Badge>
                    ) : null}
                    {profile.isFollowing && profile.followsYou ? (
                      <Badge variant="secondary">{t("mutual")}</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("joined", {
                      date: formatJoinedDate(profile.createdAt, locale),
                    })}
                  </p>
                </div>

                {profile.bio ? (
                  <p className="text-sm leading-6 text-foreground/85">
                    {profile.bio}
                  </p>
                ) : null}
              </div>

              {profile.isSelf ? (
                <Button
                  asChild
                  className="w-full"
                  type="button"
                  variant="outline"
                >
                  <Link href="/settings/account">{t("editProfile")}</Link>
                </Button>
              ) : (
                <ProfileFollowAction
                  locale={locale}
                  username={profile.username}
                  initialFollowing={profile.isFollowing}
                  initialTag={profile.followTag}
                  isAuthenticated={Boolean(viewer)}
                  canFollow={profile.publicProfileEnabled}
                />
              )}

              <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
                <Users
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="font-semibold tabular-nums text-foreground">
                  {profile.followerCount.toLocaleString(locale)}
                </span>
                <span className="text-muted-foreground">{t("followers")}</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {profile.followingCount.toLocaleString(locale)}
                </span>
                <span className="text-muted-foreground">{t("following")}</span>
              </div>

              <ProfileArenaLevelBar
                locale={locale}
                score={profile.overview.arenaScore}
              />

              {profile.achievementWall.length > 0 ? (
                <div className="space-y-2 border-t border-border/50 pt-4">
                  <h2 className="text-left text-sm font-semibold text-foreground">
                    {t("achievementWallTitle")}
                  </h2>
                  <ProfileAchievementWall items={profile.achievementWall} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          <Card className="gap-0 overflow-hidden p-0 shadow-sm ring-1 ring-border/60">
            <header className="flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border/60 bg-muted/40 px-4 py-2.5 dark:bg-muted/25">
              <div className="min-w-0">
                <CardTitle className="text-base leading-tight">
                  {t("activityTitle")}
                </CardTitle>
              </div>
              <div className="flex shrink-0 items-baseline gap-1 text-sm">
                <span className="font-semibold tabular-nums text-foreground">
                  {profile.overview.activeDays.toLocaleString(locale)}
                </span>
                <span className="text-muted-foreground">{t("activeDays")}</span>
              </div>
            </header>
            <CardContent className="flex flex-col gap-4 px-4 pb-4 pt-4">
              {hasActivity ? null : (
                <p className="text-sm text-muted-foreground">
                  {t("noActivity")}
                </p>
              )}
              <ProfileHeatmap
                locale={locale}
                days={profile.heatmap}
                lessLabel={t("less")}
                moreLabel={t("more")}
              />
            </CardContent>
          </Card>

          {profile.isSelf && !profile.publicProfileEnabled ? (
            <Card className="border-dashed bg-card ring-1 ring-border/60">
              <CardContent className="space-y-2 py-1">
                <div className="text-sm font-medium">
                  {t("privateBannerTitle")}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("privateBannerDescription")}
                </p>
                <Button asChild type="button" variant="outline" size="sm">
                  <Link href="/usage">{t("goToDashboard")}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
            <Card className="bg-card shadow-sm ring-1 ring-border/60">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">
                  {t("totalTokens")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-1">
                <div className="text-xl font-semibold">
                  {formatTokenCount(profile.overview.totalTokens)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm ring-1 ring-border/60">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">
                  {t("estimatedCost")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-1">
                <div className="text-xl font-semibold">
                  {formatUsdAmount(profile.overview.estimatedCostUsd, locale)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm ring-1 ring-border/60">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">
                  {t("activeTime")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-1">
                <div className="text-xl font-semibold">
                  {formatDuration(profile.overview.activeSeconds)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm ring-1 ring-border/60">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">
                  {t("sessions")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-1">
                <div className="text-xl font-semibold">
                  {profile.overview.sessions.toLocaleString(locale)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="gap-0 overflow-hidden p-0 shadow-sm ring-1 ring-border/60">
              <header className="border-b border-border/60 bg-muted/40 px-4 py-2.5 dark:bg-muted/25">
                <div className="min-w-0">
                  <CardTitle className="text-base leading-tight">
                    {t("topTools")}
                  </CardTitle>
                </div>
              </header>
              <CardContent className="px-4 pb-4 pt-4">
                <ProfileTopList
                  locale={locale}
                  items={profile.topTools}
                  emptyLabel={t("noTopTools")}
                />
              </CardContent>
            </Card>

            <Card className="gap-0 overflow-hidden p-0 shadow-sm ring-1 ring-border/60">
              <header className="border-b border-border/60 bg-muted/40 px-4 py-2.5 dark:bg-muted/25">
                <div className="min-w-0">
                  <CardTitle className="text-base leading-tight">
                    {t("topModels")}
                  </CardTitle>
                </div>
              </header>
              <CardContent className="px-4 pb-4 pt-4">
                <ProfileTopList
                  locale={locale}
                  items={profile.topModels}
                  emptyLabel={t("noTopModels")}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SocialShell>
  );
}
