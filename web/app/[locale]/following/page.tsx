import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileListItem } from "@/components/social/profile-list-item";
import { SocialShell } from "@/components/social/social-shell";
import { Card, CardContent } from "@/components/ui/card";
import { getSessionOrRedirect } from "@/lib/session";
import { listFollowingProfiles } from "@/lib/social/queries";

type FollowingPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: FollowingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "social.network" });

  return {
    title: `${t("followingTitle")} | Tokens Burned`,
    description: t("followingDescription"),
  };
}

export default async function FollowingPage({ params }: FollowingPageProps) {
  const { locale } = await params;
  const session = await getSessionOrRedirect(locale);
  const t = await getTranslations({ locale, namespace: "social.network" });
  const tCard = await getTranslations({ locale, namespace: "social.card" });
  const profiles = await listFollowingProfiles(session.user.id);

  return (
    <SocialShell
      locale={locale}
      viewer={{
        email: session.user.email,
        username: session.user.username,
      }}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("followingTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("followingDescription")}
          </p>
        </div>

        {profiles.length > 0 ? (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <ProfileListItem
                key={profile.id}
                locale={locale}
                profile={profile}
                isAuthenticated
                labels={{
                  followers: tCard("followers"),
                  following: tCard("following"),
                  mutual: tCard("mutual"),
                  private: tCard("private"),
                  you: tCard("you"),
                  viewProfile: tCard("viewProfile"),
                }}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-background/90 shadow-sm ring-1 ring-border/60">
            <CardContent className="py-6 text-sm text-muted-foreground">
              {t("emptyFollowing")}
            </CardContent>
          </Card>
        )}
      </div>
    </SocialShell>
  );
}
