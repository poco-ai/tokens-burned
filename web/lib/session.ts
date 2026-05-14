import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export async function getOptionalSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getSessionOrRedirect(locale?: string) {
  const session = await getOptionalSession();

  if (!session) {
    redirect(locale ? `/${locale}/login?invalid=1` : "/login?invalid=1");
  }

  return session;
}
