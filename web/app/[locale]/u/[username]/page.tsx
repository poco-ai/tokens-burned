import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FollowButton } from "@/components/social/follow-button";
import { ProfileHeatmap } from "@/components/social/profile-heatmap";
import { ProfileTopList } from "@/components/social/profile-top-list";
import { SocialShell } from "@/components/social/social-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getOptionalSession } from "@/lib/session";
import { getPublicProfilePageData } from "@/lib/social/queries";
import { formatDuration, formatTokenCount } from "@/lib/usage/format";

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
    title: `@${username} | Tokens Burned`,
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
              email: viewer.user.email,
              username: viewer.user.username,
            }
          : null
      }
    >
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="bg-background/90 shadow-sm ring-1 ring-border/60">
            <CardContent className="space-y-4 py-1">
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
                  <div className="flex flex-wrap items-center gap-2">
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
                    @{profile.username}
                  </p>
                </div>

                {profile.bio ? (
                  <p className="text-sm leading-6 text-foreground/85">
                    {profile.bio}
                  </p>
                ) : null}

                <p className="text-sm text-muted-foreground">
                  {t("joined", {
                    date: formatJoinedDate(profile.createdAt, locale),
                  })}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span>
                  {profile.followerCount.toLocaleString(locale)}{" "}
                  {t("followers")}
                </span>
                <span>·</span>
                <span>
                  {profile.followingCount.toLocaleString(locale)}{" "}
                  {t("following")}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {profile.isSelf ? (
                  <Button asChild type="button" size="sm">
                    <Link href="/usage">{t("goToDashboard")}</Link>
                  </Button>
                ) : (
                  <FollowButton
                    locale={locale}
                    username={profile.username}
                    initialFollowing={profile.isFollowing}
                    isAuthenticated={Boolean(viewer)}
                    canFollow={profile.publicProfileEnabled}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-6">
          {profile.isSelf && !profile.publicProfileEnabled ? (
            <Card className="border-dashed bg-background/80 ring-1 ring-border/60">
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

          <Card className="bg-background/90 shadow-sm ring-1 ring-border/60">
            <CardHeader className="border-b border-border/50 pb-3">
              <CardTitle>{t("activityTitle")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("activitySubtitle")}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
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

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="bg-background/90 shadow-sm ring-1 ring-border/60">
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

            <Card className="bg-background/90 shadow-sm ring-1 ring-border/60">
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

            <Card className="bg-background/90 shadow-sm ring-1 ring-border/60">
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

            <Card className="bg-background/90 shadow-sm ring-1 ring-border/60">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">
                  {t("activeDays")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-1">
                <div className="text-xl font-semibold">
                  {profile.overview.activeDays.toLocaleString(locale)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="bg-background/90 shadow-sm ring-1 ring-border/60">
              <CardHeader className="border-b border-border/50 pb-3">
                <CardTitle>{t("topTools")}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ProfileTopList
                  locale={locale}
                  mode="count"
                  items={profile.topTools}
                  emptyLabel={t("noTopTools")}
                />
              </CardContent>
            </Card>

            <Card className="bg-background/90 shadow-sm ring-1 ring-border/60">
              <CardHeader className="border-b border-border/50 pb-3">
                <CardTitle>{t("topModels")}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ProfileTopList
                  locale={locale}
                  mode="tokens"
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
