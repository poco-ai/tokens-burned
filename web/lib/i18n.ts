export const supportedLocales = ["en", "zh"] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const defaultLocale: AppLocale = "en";
export const localeCookieName = "tb-locale";

export function isSupportedLocale(value: string): value is AppLocale {
  return supportedLocales.includes(value as AppLocale);
}

export function normalizeLocale(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const [language] = value.toLowerCase().split("-");

  return isSupportedLocale(language) ? language : null;
}

export function getPreferredLocale(input: {
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}): AppLocale {
  const cookieLocale = normalizeLocale(input.cookieLocale);

  if (cookieLocale) {
    return cookieLocale;
  }

  const acceptedLanguages = (input.acceptLanguage ?? "")
    .split(",")
    .flatMap((part) => {
      const code = part.trim().split(";")[0]?.trim();
      return code ? [code] : [];
    });

  for (const language of acceptedLanguages) {
    const locale = normalizeLocale(language);

    if (locale) {
      return locale;
    }
  }

  return defaultLocale;
}

function extractLocaleFromPathname(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const candidate = segments[0];

  return candidate && isSupportedLocale(candidate) ? candidate : null;
}

export function stripLocalePrefix(pathname: string) {
  const locale = extractLocaleFromPathname(pathname);

  if (!locale) {
    return pathname;
  }

  const nextPath = pathname.slice(locale.length + 1);

  return nextPath.length > 0 ? nextPath : "/";
}
