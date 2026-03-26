const percentageFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const datePartsFormatterCache = new Map<string, Intl.DateTimeFormat>();
const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

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

function getDateTimeFormatter(timezone: string) {
  const cached = dateTimeFormatterCache.get(timezone);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  dateTimeFormatterCache.set(timezone, formatter);

  return formatter;
}

function normalizeDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function formatTokenCount(value: number): string {
  if (value < 1000) {
    return String(value);
  }

  if (value < 1_000_000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  if (value < 1_000_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  return `${(value / 1_000_000_000).toFixed(1)}B`;
}

export function formatDuration(seconds: number) {
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

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function formatPercentage(value: number) {
  return percentageFormatter.format(value);
}

export function formatDateInput(value: Date | string, timezone: string) {
  return getDatePartsFormatter(timezone).format(normalizeDate(value));
}

export function formatDateTime(value: Date | string, timezone: string) {
  return getDateTimeFormatter(timezone).format(normalizeDate(value));
}
