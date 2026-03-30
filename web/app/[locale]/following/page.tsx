import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";

type FollowingPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: FollowingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "social.network" });

  return {
    title: `${t("followingTitle")} | Token Arena`,
    description: t("followingDescription"),
  };
}

export default async function FollowingPage({ params }: FollowingPageProps) {
  const { locale } = await params;
  await getSessionOrRedirect(locale);
  redirect(`/${locale}/people?tab=following`);
}
