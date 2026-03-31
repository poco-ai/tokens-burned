import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AchievementCard } from "@/components/achievements/achievement-card";
import { AppShell } from "@/components/app/app-shell";
import { redirectIfUsernameSetupNeeded } from "@/lib/account-setup";
import { getAchievementsPageData } from "@/lib/achievements/queries";
import { getSessionOrRedirect } from "@/lib/session";

type AchievementsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: AchievementsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "achievements.page" });
  const tNav = await getTranslations({ locale, namespace: "social.nav" });

  return {
    title: `${tNav("achievements")} | Token Arena`,
    description: t("description"),
  };
}

export default async function AchievementsPage({
  params,
}: AchievementsPageProps) {
  const { locale } = await params;
  const session = await getSessionOrRedirect(locale);
  redirectIfUsernameSetupNeeded(locale, session.user);
  const data = await getAchievementsPageData(session.user.id);
  const tSection = await getTranslations({
    locale,
    namespace: "achievements.sections",
  });
  const tItems = await getTranslations({
    locale,
    namespace: "achievements.items",
  });

  return (
    <AppShell
      locale={locale}
      viewer={{
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        username: session.user.username,
      }}
    >
      <div className="min-w-0 text-foreground">
        <div className="space-y-10 xl:space-y-12">
          {data.sections.map((section) => (
            <section key={section.category} className="w-full">
              <div className="space-y-2">
                <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  {tSection(`${section.category}.title`)}
                </h2>
                <p className="max-w-3xl break-words text-sm leading-6 text-muted-foreground">
                  {tSection(`${section.category}.description`)}
                </p>
              </div>

              <div className="mt-5 grid w-full min-w-0 grid-cols-2 items-stretch gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
                {section.achievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.code}
                    achievement={achievement}
                    title={tItems(`${achievement.code}.title`)}
                    description={tItems(`${achievement.code}.description`)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
