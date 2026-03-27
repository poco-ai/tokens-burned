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

function getMonthLabel(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(
    parseDateKey(value),
  );
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

function getLevelClassName(level: ProfileHeatmapDay["level"]) {
  switch (level) {
    case 0:
      return "bg-muted";
    case 1:
      return "bg-emerald-200 dark:bg-emerald-950/80";
    case 2:
      return "bg-emerald-400/80 dark:bg-emerald-700/80";
    case 3:
      return "bg-emerald-600/90 dark:bg-emerald-500/90";
    case 4:
      return "bg-emerald-800 dark:bg-emerald-300";
    default:
      return "bg-muted";
  }
}

export function ProfileHeatmap({
  locale,
  days,
  lessLabel,
  moreLabel,
}: ProfileHeatmapProps) {
  const weeks = buildWeeks(days);
  const monthLabels = weeks.map((week, index) => {
    const firstDay = week.find(
      (value): value is ProfileHeatmapDay => value !== null,
    );
    const previous = weeks[index - 1]?.find(
      (value): value is ProfileHeatmapDay => value !== null,
    );

    if (!firstDay) {
      return {
        key: `empty-week`,
        label: "",
      };
    }

    const label = getMonthLabel(firstDay.date, locale);

    return {
      key: firstDay.date,
      label:
        previous && getMonthLabel(previous.date, locale) === label ? "" : label,
    };
  });
  const weekdayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const cellClassName =
    "size-3 rounded-[2px] ring-1 ring-black/5 dark:ring-white/5";

  return (
    <div className="space-y-3">
      <div className={cn(styles.scroller, "overflow-x-auto pb-2")}>
        <div className="min-w-max space-y-3">
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
            }}
          >
            {monthLabels.map((item, index) => (
              <div
                key={item.key || `empty-week-${index}`}
                className="h-4 text-[11px] text-muted-foreground"
              >
                {item.label}
              </div>
            ))}
          </div>

          <div className="flex min-w-max gap-1">
            {weeks.map((week, weekIndex) => {
              const firstDay = week.find(
                (value): value is ProfileHeatmapDay => value !== null,
              );
              const weekKey = firstDay?.date ?? `empty-week-${weekIndex}`;

              return (
                <div key={weekKey} className="grid grid-rows-7 gap-1">
                  {week.map((day, dayIndex) =>
                    day ? (
                      <div
                        key={day.date}
                        title={`${day.date} · ${formatDuration(day.activeSeconds)} · ${day.sessions} sessions · ${formatTokenCount(day.totalTokens)} tokens`}
                        className={cn(
                          cellClassName,
                          getLevelClassName(day.level),
                        )}
                      />
                    ) : (
                      <div
                        key={`${weekKey}-${weekdayKeys[dayIndex]}`}
                        aria-hidden="true"
                        className="size-3"
                      />
                    ),
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
        <span>{lessLabel}</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={cn(cellClassName, getLevelClassName(level))}
          />
        ))}
        <span>{moreLabel}</span>
      </div>
    </div>
  );
}
