import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedAppPath } from "@/lib/account-setup";
import { getOptionalSession } from "@/lib/session";
import { getUsagePreference } from "@/lib/usage/preferences";

export const metadata: Metadata = {
  title: "Token Arena",
};

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, session] = await Promise.all([
    params,
    getOptionalSession(),
  ]);

  if (session) {
    const preference = await getUsagePreference(session.user.id);
    redirect(getAuthenticatedAppPath(preference.locale, session.user));
  }

  redirect(`/${locale}/login`);
}
