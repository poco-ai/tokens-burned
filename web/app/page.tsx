import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPreferredLocale, localeCookieName } from "@/lib/i18n";
import { getOptionalSession } from "@/lib/session";
import { getUsagePreference } from "@/lib/usage/preferences";

export const metadata: Metadata = {
  title: "Token Arena",
};

export default async function HomePage() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const fallbackLocale = getPreferredLocale({
    cookieLocale: cookieStore.get(localeCookieName)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
  const session = await getOptionalSession();

  if (session) {
    const preference = await getUsagePreference(session.user.id);
    redirect(`/${preference.locale ?? fallbackLocale}/usage`);
  }

  redirect(`/${fallbackLocale}/login`);
}
