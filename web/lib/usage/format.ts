const datePartsFormatterCache = new Map<string, Intl.DateTimeFormat>();
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();
const percentageFormatterCache = new Map<string, Intl.NumberFormat>();
const compactCurrencyFormatterCache = new Map<string, Intl.NumberFormat>();
const preciseCurrencyFormatterCache = new Map<string, Intl.NumberFormat>();
const rateCurrencyFormatterCache = new Map<string, Intl.NumberFormat>();

function getDatePartsFormatter(timezone: string) {
  const cached = datePartsFormatterCache.get(timezone);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  datePartsFormatterCache.set(timezone, formatter);

  return formatter;
}

function getDateFormatter(timezone: string, locale = "en") {
  const cacheKey = `${locale}:${timezone}`;
  const cached = dateFormatterCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  dateFormatterCache.set(cacheKey, formatter);

  return formatter;
}

function getTimeFormatter(timezone: string, locale = "en") {
  const cacheKey = `${locale}:${timezone}`;
  const cached = timeFormatterCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  timeFormatterCache.set(cacheKey, formatter);

  return formatter;
}

function getPercentageFormatter(locale = "en") {
  const cached = percentageFormatterCache.get(locale);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  percentageFormatterCache.set(locale, formatter);

  return formatter;
}

function getCompactCurrencyFormatter(locale = "en") {
  const cached = compactCurrencyFormatterCache.get(locale);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  });

  compactCurrencyFormatterCache.set(locale, formatter);

  return formatter;
}

function getPreciseCurrencyFormatter(locale = "en", maximumFractionDigits = 2) {
  const cacheKey = `${locale}:${maximumFractionDigits}`;
  const cached = preciseCurrencyFormatterCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  });

  preciseCurrencyFormatterCache.set(cacheKey, formatter);

  return formatter;
}

function getRateCurrencyFormatter(maximumFractionDigits = 4) {
  const cacheKey = String(maximumFractionDigits);
  const cached = rateCurrencyFormatterCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });

  rateCurrencyFormatterCache.set(cacheKey, formatter);

  return formatter;
}

function normalizeDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function formatTokenCount(value: number, locale = "en"): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue < 1000) {
    return `${sign}${absValue.toLocaleString(locale)}`;
  }

  if (absValue < 1_000_000) {
    return `${sign}${(absValue / 1000).toLocaleString(locale, {
      maximumFractionDigits: 1,
    })}K`;
  }

  if (absValue < 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000).toLocaleString(locale, {
      maximumFractionDigits: 1,
    })}M`;
  }

  return `${sign}${(absValue / 1_000_000_000).toLocaleString(locale, {
    maximumFractionDigits: 1,
  })}B`;
}

export function formatDuration(
  seconds: number,
  options?: { compact?: boolean },
) {
  if (seconds <= 0) {
    return "0s";
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return options?.compact ? `${hours}h${minutes}m` : `${hours}h ${minutes}m`;
}

export function formatPercentage(value: number, locale = "en") {
  return getPercentageFormatter(locale).format(value);
}

export function formatUsdAmount(
  value: number,
  locale = "en",
  options?: { compact?: boolean },
) {
  const absValue = Math.abs(value);

  if (options?.compact && absValue >= 1000) {
    return getCompactCurrencyFormatter(locale).format(value);
  }

  if (absValue >= 1) {
    return getPreciseCurrencyFormatter(locale, 2).format(value);
  }

  if (absValue >= 0.01) {
    return getPreciseCurrencyFormatter(locale, 4).format(value);
  }

  return getPreciseCurrencyFormatter(locale, 6).format(value);
}

export function formatUsdRatePerMillion(value: number) {
  const maximumFractionDigits = value >= 1 ? 2 : 4;
  return `${getRateCurrencyFormatter(maximumFractionDigits).format(value)}/M`;
}

export function formatDateInput(value: Date | string, timezone: string) {
  return getDatePartsFormatter(timezone).format(normalizeDate(value));
}

export function formatDateTime(
  value: Date | string,
  timezone: string,
  locale = "en",
) {
  const date = normalizeDate(value);
  const datePart = getDateFormatter(timezone, locale).format(date);
  const timePart = getTimeFormatter(timezone, locale).format(date);
  return `${datePart} ${timePart}`;
}
