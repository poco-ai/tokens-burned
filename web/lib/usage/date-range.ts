import type { DashboardPreset, DashboardRange } from "./types";

export type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type ResolveDashboardRangeInput = {
  preset?: DashboardPreset;
  from?: string | Date;
  to?: string | Date;
  timezone: string;
  now?: Date;
};

const zonedDateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

function getZonedFormatter(timezone: string) {
  const cached = zonedDateFormatterCache.get(timezone);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  zonedDateFormatterCache.set(timezone, formatter);

  return formatter;
}

export function toZonedParts(date: Date, timezone: string): ZonedDateParts {
  const parts = getZonedFormatter(timezone).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number.parseInt(part.value, 10)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

export function getZonedWeekdayHour(date: Date, timezone: string) {
  const parts = toZonedParts(date, timezone);

  return {
    weekday: new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day),
    ).getUTCDay(),
    hour: parts.hour,
  };
}

function getTimezoneOffsetMs(date: Date, timezone: string) {
  const parts = toZonedParts(date, timezone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(parts: ZonedDateParts, timezone: string) {
  let utcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  for (let index = 0; index < 3; index += 1) {
    const offsetMs = getTimezoneOffsetMs(new Date(utcMs), timezone);
    const nextUtcMs =
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
      ) - offsetMs;

    if (nextUtcMs === utcMs) {
      break;
    }

    utcMs = nextUtcMs;
  }

  return new Date(utcMs);
}

function addToParts(
  parts: ZonedDateParts,
  input: { days?: number; hours?: number },
): ZonedDateParts {
  const next = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ),
  );

  if (input.days) {
    next.setUTCDate(next.getUTCDate() + input.days);
  }

  if (input.hours) {
    next.setUTCHours(next.getUTCHours() + input.hours);
  }

  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
    hour: next.getUTCHours(),
    minute: next.getUTCMinutes(),
    second: next.getUTCSeconds(),
  };
}

function startOfZonedDay(date: Date, timezone: string) {
  const parts = toZonedParts(date, timezone);

  return zonedDateTimeToUtc(
    {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: 0,
      minute: 0,
      second: 0,
    },
    timezone,
  );
}

function startOfZonedHour(date: Date, timezone: string) {
  const parts = toZonedParts(date, timezone);

  return zonedDateTimeToUtc(
    {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: parts.hour,
      minute: 0,
      second: 0,
    },
    timezone,
  );
}

function parseDateOnly(value: string) {
  const [year, month, day] = value
    .split("-")
    .map((part) => Number.parseInt(part, 10));

  return {
    year,
    month,
    day,
  };
}

function dateOnlyToUtc(value: string, timezone: string, edge: "start" | "end") {
  const parts = parseDateOnly(value);
  const startParts = {
    ...parts,
    hour: 0,
    minute: 0,
    second: 0,
  };

  if (edge === "start") {
    return zonedDateTimeToUtc(startParts, timezone);
  }

  return new Date(
    zonedDateTimeToUtc(
      addToParts(startParts, { days: 1 }),
      timezone,
    ).getTime() - 1,
  );
}

function toDate(
  value: string | Date | undefined,
  fallback: Date,
  edge: "start" | "end",
  timezone: string,
) {
  if (!value) {
    return fallback;
  }

  if (value instanceof Date) {
    return value;
  }

  if (dateOnlyPattern.test(value)) {
    return dateOnlyToUtc(value, timezone, edge);
  }

  return new Date(value);
}

export function resolveDashboardRange(
  input: ResolveDashboardRangeInput,
): DashboardRange {
  const preset = input.preset ?? "7d";
  const now = input.now ?? new Date();

  if (preset === "custom") {
    const from = toDate(input.from, now, "start", input.timezone);
    const to = toDate(input.to, now, "end", input.timezone);

    return {
      from,
      to,
      granularity:
        to.getTime() - from.getTime() <= 36 * 60 * 60 * 1000 ? "hour" : "day",
      preset,
      timezone: input.timezone,
    };
  }

  if (preset === "1d") {
    return {
      from: startOfZonedDay(now, input.timezone),
      to: now,
      granularity: "hour",
      preset,
      timezone: input.timezone,
    };
  }

  const startParts = toZonedParts(
    startOfZonedDay(now, input.timezone),
    input.timezone,
  );
  const days = preset === "7d" ? -6 : -29;

  return {
    from: zonedDateTimeToUtc(addToParts(startParts, { days }), input.timezone),
    to: now,
    granularity: "day",
    preset,
    timezone: input.timezone,
  };
}

export function getPreviousRange(range: DashboardRange): DashboardRange {
  const duration = range.to.getTime() - range.from.getTime();

  return {
    ...range,
    from: new Date(range.from.getTime() - duration),
    to: new Date(range.from.getTime()),
  };
}

export function groupByHourOrDay(range: DashboardRange, value: Date) {
  const parts = toZonedParts(value, range.timezone);

  if (range.granularity === "hour") {
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")} ${String(parts.hour).padStart(2, "0")}:00`;
  }

  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function listRangeBuckets(range: DashboardRange) {
  const buckets: Array<{ key: string; start: Date }> = [];
  const step = range.granularity === "hour" ? "hour" : "day";
  let cursor =
    step === "hour"
      ? startOfZonedHour(range.from, range.timezone)
      : startOfZonedDay(range.from, range.timezone);

  while (cursor.getTime() <= range.to.getTime()) {
    buckets.push({
      key: groupByHourOrDay(range, cursor),
      start: cursor,
    });

    const cursorParts = toZonedParts(cursor, range.timezone);
    cursor = zonedDateTimeToUtc(
      addToParts(cursorParts, step === "hour" ? { hours: 1 } : { days: 1 }),
      range.timezone,
    );
  }

  return buckets;
}
