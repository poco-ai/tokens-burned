import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileListItem } from "@/components/social/profile-list-item";
import { SocialShell } from "@/components/social/social-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getOptionalSession } from "@/lib/session";
import { searchPublicProfiles } from "@/lib/social/queries";

type PeoplePageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "social.people" });

  return {
    title: `${t("title")} | Tokens Burned`,
    description: t("description"),
  };
}

export default async function PeoplePage({
  params,
  searchParams,
}: PeoplePageProps) {
  const { locale } = await params;
  const viewer = await getOptionalSession();
  const t = await getTranslations({ locale, namespace: "social.people" });
  const tCard = await getTranslations({ locale, namespace: "social.card" });
  const query =
    firstValue(searchParams ? (await searchParams).query : "")?.trim() ?? "";
  const profiles = await searchPublicProfiles({
    query,
    viewerUserId: viewer?.user.id ?? null,
  });

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
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        <Card className="bg-background/90 shadow-sm ring-1 ring-border/60">
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle>{t("search")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="search"
                name="query"
                defaultValue={query}
                placeholder={t("searchPlaceholder")}
                className="sm:max-w-md"
              />
              <Button type="submit">{t("search")}</Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <div>
            {query ? t("results", { count: profiles.length }) : t("allPublic")}
          </div>
        </div>

        {profiles.length > 0 ? (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <ProfileListItem
                key={profile.id}
                locale={locale}
                profile={profile}
                isAuthenticated={Boolean(viewer)}
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
              {t("empty")}
            </CardContent>
          </Card>
        )}
      </div>
    </SocialShell>
  );
}
