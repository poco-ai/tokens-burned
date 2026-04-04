import { type AppLocale, defaultLocale, isSupportedLocale } from "@/lib/i18n";

function normalizeOrigin(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

export function getAppOrigin() {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_ORIGIN) ??
    normalizeOrigin(process.env.BETTER_AUTH_URL)
  );
}

export function resolveAppLocale(value: string | null | undefined): AppLocale {
  return value && isSupportedLocale(value) ? value : defaultLocale;
}

export function buildAbsoluteUrl(pathname: string) {
  const origin = getAppOrigin();

  return origin ? new URL(pathname, origin).toString() : null;
}
