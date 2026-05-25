import type { ProfileHeatmapDay } from "@/lib/social/queries";
import { formatDuration } from "@/lib/usage/format";

export type ActivityHeatmapSvgTheme = "dark" | "light";

export type RenderActivityHeatmapSvgInput = {
  locale: string;
  title: string;
  username: string;
  days: ProfileHeatmapDay[];
  lessLabel: string;
  moreLabel: string;
  theme?: ActivityHeatmapSvgTheme;
};

type HeatmapCell = ProfileHeatmapDay | null;

type ThemePalette = {
  background: string;
  mutedText: string;
  levels: readonly [string, string, string, string, string];
};

const CELL_SIZE = 11;
const CELL_GAP = 3;
const WEEK_GAP = 3;
const LEGEND_HEIGHT = 18;
const GRID_TOP = 34;
const GRID_LEFT = 20;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const THEMES: Record<ActivityHeatmapSvgTheme, ThemePalette> = {
  dark: {
    background: "#09090b",
    mutedText: "#a1a1aa",
    levels: ["#27272a", "#064e3b", "#047857", "#10b981", "#6ee7b7"],
  },
  light: {
    background: "#ffffff",
    mutedText: "#52525b",
    levels: ["#e4e4e7", "#bbf7d0", "#86efac", "#22c55e", "#15803d"],
  },
};

function parseDateKey(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

const monthLabelFormatterCache = new Map<string, Intl.DateTimeFormat>();

function formatMonthLabel(value: string, locale: string) {
  let formatter = monthLabelFormatterCache.get(locale);
  if (!formatter) {
    formatter = Intl.DateTimeFormat(locale, {
      month: "short",
      timeZone: "UTC",
    });
    monthLabelFormatterCache.set(locale, formatter);
  }
  return formatter.format(parseDateKey(value));
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function chunk<T>(values: T[], size: number) {
  const result: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }

  return result;
}

function buildWeeks(days: ProfileHeatmapDay[]) {
  if (days.length === 0) {
    return [] as HeatmapCell[][];
  }

  const firstDate = parseDateKey(days[0].date);
  const leadingPadding = firstDate.getUTCDay();
  const trailingPadding = (7 - ((leadingPadding + days.length) % 7)) % 7;
  const padded: HeatmapCell[] = [
    ...Array.from({ length: leadingPadding }, () => null),
    ...days,
    ...Array.from({ length: trailingPadding }, () => null),
  ];

  return chunk(padded, 7);
}

function buildMonthLabels(weeks: HeatmapCell[][], locale: string) {
  return weeks.map((week, index) => {
    const filledDays = week.filter(
      (value): value is ProfileHeatmapDay => value !== null,
    );

    if (filledDays.length === 0) {
      return {
        key: `empty-week-${index}`,
        label: "",
      };
    }

    const labelDay =
      index === 0
        ? filledDays[0]
        : filledDays.find((day) => day.date.endsWith("-01"));

    return {
      key: labelDay?.date ?? filledDays[0].date,
      label: labelDay ? formatMonthLabel(labelDay.date, locale) : "",
    };
  });
}

function getCellFill(level: ProfileHeatmapDay["level"], theme: ThemePalette) {
  return theme.levels[level] ?? theme.levels[0];
}

function getTooltipLabel(day: ProfileHeatmapDay) {
  return `${day.date} · ${formatDuration(day.activeSeconds)} · ${day.sessions} sessions · ${day.totalTokens.toLocaleString("en-US")} tokens`;
}

export function renderActivityHeatmapSvg(input: RenderActivityHeatmapSvgInput) {
  const theme = THEMES[input.theme ?? "dark"];
  const weeks = buildWeeks(input.days);
  const monthLabels = buildMonthLabels(weeks, input.locale);
  const weeksCount = Math.max(weeks.length, 1);
  const gridWidth =
    weeksCount * CELL_SIZE + Math.max(0, weeksCount - 1) * WEEK_GAP;
  const width = GRID_LEFT * 2 + gridWidth;
  const gridHeight = 7 * CELL_SIZE + 6 * CELL_GAP;
  const height = GRID_TOP + gridHeight + LEGEND_HEIGHT + 18;

  const monthText = monthLabels
    .map((item, weekIndex) => {
      if (!item.label) {
        return "";
      }

      const x = GRID_LEFT + weekIndex * (CELL_SIZE + WEEK_GAP);
      return `<text x="${x}" y="16" fill="${theme.mutedText}" font-size="11" font-family="ui-sans-serif, system-ui, sans-serif">${escapeXml(item.label)}</text>`;
    })
    .join("");

  const weekRects = weeks
    .map((week, weekIndex) => {
      const x = GRID_LEFT + weekIndex * (CELL_SIZE + WEEK_GAP);
      return week
        .map((day, dayIndex) => {
          if (!day) {
            return "";
          }

          const y = GRID_TOP + dayIndex * (CELL_SIZE + CELL_GAP);
          const label = escapeXml(getTooltipLabel(day));
          return `<rect x="${x}" y="${y}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="2" fill="${getCellFill(day.level, theme)}"><title>${label}</title></rect>`;
        })
        .join("");
    })
    .join("");

  const legendX = width - GRID_LEFT - (5 * CELL_SIZE + 4 * CELL_GAP) - 50;
  const legendY = height - 10;
  const legend = `
    <text x="${legendX}" y="${legendY}" fill="${theme.mutedText}" font-size="11" font-family="ui-sans-serif, system-ui, sans-serif">${escapeXml(input.lessLabel)}</text>
    ${[0, 1, 2, 3, 4]
      .map((level, index) => {
        const x = legendX + 26 + index * (CELL_SIZE + CELL_GAP);
        return `<rect x="${x}" y="${legendY - 9}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="2" fill="${getCellFill(level as ProfileHeatmapDay["level"], theme)}" />`;
      })
      .join("")}
    <text x="${legendX + 26 + 5 * (CELL_SIZE + CELL_GAP) + 4}" y="${legendY}" fill="${theme.mutedText}" font-size="11" font-family="ui-sans-serif, system-ui, sans-serif">${escapeXml(input.moreLabel)}</text>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="${SVG_NAMESPACE}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-label="${escapeXml(input.title)}">
  <rect width="${width}" height="${height}" rx="14" fill="${theme.background}"/>
  ${monthText}
  ${weekRects}
  ${legend}
</svg>`;
}

export function resolveActivityHeatmapSvgTheme(
  value: string | null | undefined,
): ActivityHeatmapSvgTheme {
  return value === "light" ? "light" : "dark";
}

export function buildActivitySvgUrl(input: {
  baseUrl: string;
  locale: string;
  username: string;
  theme?: ActivityHeatmapSvgTheme;
}) {
  const url = new URL(
    `/${input.locale}/u/${input.username}/activity.svg`,
    input.baseUrl,
  );
  if (input.theme && input.theme !== "dark") {
    url.searchParams.set("theme", input.theme);
  }
  return url.toString();
}
