import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import {
  getPreferredLocale,
  localeCookieName,
  stripLocalePrefix,
} from "./lib/i18n";

const PROTECTED_PREFIXES = [
  "/usage",
  "/settings",
  "/settings/keys",
  "/following",
  "/followers",
];
const AUTH_PAGES = ["/login", "/register"];
const handleI18nRouting = createMiddleware(routing);

function detectLocale(request: NextRequest) {
  return getPreferredLocale({
    cookieLocale: request.cookies.get(localeCookieName)?.value,
    acceptLanguage: request.headers.get("accept-language"),
  });
}

export function proxy(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const pathname = stripLocalePrefix(request.nextUrl.pathname);
  const hasSessionCookie = Boolean(getSessionCookie(request));
  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isAuthPage = AUTH_PAGES.includes(pathname);
  const isInvalidSessionBounce = searchParams.get("invalid") === "1";

  if (isProtectedPath && !hasSessionCookie) {
    const locale = detectLocale(request);
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("invalid", "1");
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && hasSessionCookie && !isInvalidSessionBounce) {
    const locale = detectLocale(request);
    return NextResponse.redirect(new URL(`/${locale}/usage`, request.url));
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
