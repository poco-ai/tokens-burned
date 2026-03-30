import { redirect } from "next/navigation";
import { getAuthenticatedAppPath } from "@/lib/account-setup";
import { getOptionalSession } from "@/lib/session";
import { getUsagePreference } from "@/lib/usage/preferences";

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getOptionalSession();

  if (session) {
    const preference = await getUsagePreference(session.user.id);
    redirect(getAuthenticatedAppPath(preference.locale, session.user));
  }

  redirect(`/${locale}/login`);
}
