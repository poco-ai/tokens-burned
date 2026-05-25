"use client";

import { useEffect, useRef } from "react";
import type { ProfileHeatmapDay } from "@/lib/social/queries";
import { formatDuration, formatTokenCount } from "@/lib/usage/format";
import { cn } from "@/lib/utils";
import styles from "./profile-heatmap.module.css";

type ProfileHeatmapProps = {
  locale: string;
  days: ProfileHeatmapDay[];
  lessLabel: string;
  moreLabel: string;
};

type HeatmapCell = ProfileHeatmapDay | null;

function parseDateKey(value: string) {
  return new Date(`${value}T00:00:00Z`);
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

function getLevelClassName(level: ProfileHeatmapDay["level"]) {
  switch (level) {
    case 0:
      return "bg-muted dark:bg-foreground/12";
    case 1:
      return "bg-emerald-200 dark:bg-emerald-900";
    case 2:
      return "bg-emerald-400/80 dark:bg-emerald-700";
    case 3:
      return "bg-emerald-600/90 dark:bg-emerald-500";
    case 4:
      return "bg-emerald-800 dark:bg-emerald-300";
    default:
      return "bg-muted";
  }
}

function getTooltipLabel(day: ProfileHeatmapDay) {
  return `${day.date} · ${formatDuration(day.activeSeconds)} · ${day.sessions} sessions · ${formatTokenCount(day.totalTokens)} tokens`;
}

export function ProfileHeatmap({
  locale,
  days,
  lessLabel,
  moreLabel,
}: ProfileHeatmapProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const weeks = buildWeeks(days);
  const monthLabels = buildMonthLabels(weeks, locale);
  const weeksGridTemplate = `repeat(${weeks.length}, minmax(var(--heatmap-cell-min), 1fr))`;
  const weekdayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const cellClassName = cn(
    styles.cell,
    "rounded-[3px] ring-1 ring-border/35 transition-colors",
  );

  useEffect(() => {
    const element = scrollerRef.current;

    if (!element) {
      return;
    }

    let frameA = 0;
    let frameB = 0;

    const scrollToCurrentDate = () => {
      element.scrollLeft = Math.max(
        0,
        element.scrollWidth - element.clientWidth,
      );
    };

    frameA = requestAnimationFrame(() => {
      scrollToCurrentDate();
      frameB = requestAnimationFrame(scrollToCurrentDate);
    });

    return () => {
      cancelAnimationFrame(frameA);
      cancelAnimationFrame(frameB);
    };
  }, []);

  return (
    <div className={styles.root}>
      <div
        ref={scrollerRef}
        className={cn(
          styles.scroller,
          "overflow-x-auto overflow-y-hidden pb-2",
        )}
      >
        <div className={styles.content}>
          <div
            className={styles.months}
            style={{
              gridTemplateColumns: weeksGridTemplate,
            }}
          >
            {monthLabels.map((item, monthIndex) => (
              <div
                key={`${item.key}-m-${monthIndex}`}
                className={cn(styles.monthLabel, "text-muted-foreground")}
                suppressHydrationWarning
              >
                {item.label}
              </div>
            ))}
          </div>

          <div
            className={styles.weeks}
            style={{
              gridTemplateColumns: weeksGridTemplate,
            }}
          >
            {weeks.map((week, weekIndex) => {
              const firstDay = week.find(
                (value): value is ProfileHeatmapDay => value !== null,
              );
              const weekKey = firstDay?.date ?? `empty-week-${weekIndex}`;

              return (
                <div key={weekKey} className={styles.week}>
                  {week.map((day, dayIndex) =>
                    day ? (
                      <div
                        key={day.date}
                        role="img"
                        title={getTooltipLabel(day)}
                        aria-label={getTooltipLabel(day)}
                        className={cn(
                          cellClassName,
                          getLevelClassName(day.level),
                        )}
                      />
                    ) : (
                      <div
                        key={`${weekKey}-${weekdayKeys[dayIndex]}`}
                        aria-hidden="true"
                        className={styles.spacer}
                      />
                    ),
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={cn(styles.legend, "text-muted-foreground")}>
        <span className={styles.legendLabel}>{lessLabel}</span>
        <div className={styles.legendScale}>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <span
              key={level}
              className={cn(
                cellClassName,
                styles.legendSwatch,
                getLevelClassName(level),
              )}
            />
          ))}
        </div>
        <span className={styles.legendLabel}>{moreLabel}</span>
      </div>
    </div>
  );
}
