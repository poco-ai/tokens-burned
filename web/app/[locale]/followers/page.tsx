import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";

type FollowersPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: FollowersPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "social.network" });

  return {
    title: `${t("followersTitle")} | Token Arena`,
    description: t("followersDescription"),
  };
}

export default async function FollowersPage({ params }: FollowersPageProps) {
  const { locale } = await params;
  await getSessionOrRedirect(locale);
  redirect(`/${locale}/people?tab=followers`);
}
