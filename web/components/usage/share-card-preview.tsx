"use client";

import {
  Activity,
  Brain,
  FolderGit2,
  Layers3,
  MessagesSquare,
  Sparkles,
  Wrench,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { buildAbsoluteUrl } from "@/lib/site-url";
import {
  formatDuration,
  formatPercentage,
  formatTokenCount,
  formatUsdAmount,
} from "@/lib/usage/format";
import type {
  UsageShareCardData,
  UsageShareCardPersona,
  UsageShareCardTemplate,
} from "@/lib/usage/share-card";
import { cn } from "@/lib/utils";

export type UsageShareCardPrivacy = {
  hideProjectNames: boolean;
  hideCost: boolean;
  hideUsername: boolean;
};

type UsageShareCardPreviewProps = {
  data: UsageShareCardData;
  template: UsageShareCardTemplate;
  privacy: UsageShareCardPrivacy;
  locale: string;
  size?: "preview" | "export";
  className?: string;
};

type TranslationFn = (
  key: string,
  values?: Record<string, string | number>,
) => string;

const QRCode = dynamic(() => import("react-qr-code"), {
  ssr: false,
  loading: () => (
    <div className="size-11 rounded-sm bg-[var(--receipt-paper-fg-strong)]/10 sm:size-[72px]" />
  ),
});

const paletteMap: Record<
  UsageShareCardPersona,
  {
    from: string;
    to: string;
    accent: string;
    accentSoft: string;
    chip: string;
    glowA: string;
    glowB: string;
  }
> = {
  reasoning_master: {
    from: "#120c30",
    to: "#2f1b67",
    accent: "#a78bfa",
    accentSoft: "rgba(167,139,250,0.26)",
    chip: "rgba(167,139,250,0.18)",
    glowA: "rgba(139,92,246,0.45)",
    glowB: "rgba(59,130,246,0.30)",
  },
  cache_guardian: {
    from: "#071b16",
    to: "#134e4a",
    accent: "#34d399",
    accentSoft: "rgba(52,211,153,0.26)",
    chip: "rgba(52,211,153,0.18)",
    glowA: "rgba(16,185,129,0.42)",
    glowB: "rgba(45,212,191,0.24)",
  },
  project_deep_diver: {
    from: "#16151f",
    to: "#3b1f49",
    accent: "#f472b6",
    accentSoft: "rgba(244,114,182,0.22)",
    chip: "rgba(244,114,182,0.16)",
    glowA: "rgba(236,72,153,0.34)",
    glowB: "rgba(249,115,22,0.20)",
  },
  model_orchestrator: {
    from: "#0b1224",
    to: "#1e3a8a",
    accent: "#60a5fa",
    accentSoft: "rgba(96,165,250,0.24)",
    chip: "rgba(96,165,250,0.16)",
    glowA: "rgba(59,130,246,0.42)",
    glowB: "rgba(99,102,241,0.20)",
  },
  rapid_shipper: {
    from: "#1f1304",
    to: "#7c2d12",
    accent: "#fb923c",
    accentSoft: "rgba(251,146,60,0.26)",
    chip: "rgba(251,146,60,0.18)",
    glowA: "rgba(249,115,22,0.42)",
    glowB: "rgba(251,191,36,0.20)",
  },
  steady_builder: {
    from: "#111827",
    to: "#1f2937",
    accent: "#c4b5fd",
    accentSoft: "rgba(196,181,253,0.18)",
    chip: "rgba(196,181,253,0.12)",
    glowA: "rgba(99,102,241,0.24)",
    glowB: "rgba(148,163,184,0.16)",
  },
};

const sizePresets = {
  preview: {
    root: "aspect-[4/3] w-full max-w-[760px]",
    padding: "p-6 sm:p-8",
    hero: "text-4xl sm:text-6xl",
    title: "text-2xl sm:text-4xl",
    body: "text-sm",
    micro: "text-[11px] sm:text-xs",
    metric: "text-base sm:text-lg",
    pill: "px-2.5 py-1 text-[11px]",
  },
  export: {
    root: "h-[900px] w-[1200px]",
    padding: "p-12",
    hero: "text-[96px] leading-none",
    title: "text-[54px] leading-tight",
    body: "text-[24px]",
    micro: "text-[18px]",
    metric: "text-[28px]",
    pill: "px-4 py-1.5 text-[16px]",
  },
} as const;

const shortDateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function formatShortDate(value: string, locale: string, timezone: string) {
  const cacheKey = `${locale}:${timezone}`;
  let formatter = shortDateFormatterCache.get(cacheKey);
  if (!formatter) {
    formatter = Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      timeZone: timezone,
    });
    shortDateFormatterCache.set(cacheKey, formatter);
  }
  return formatter.format(new Date(value));
}

function getRangeLabel(
  data: UsageShareCardData,
  locale: string,
  t: TranslationFn,
) {
  if (data.period !== "custom") {
    return t(`card.range.${data.period}`);
  }

  return t("card.customRange", {
    from: formatShortDate(data.range.from, locale, data.range.timezone),
    to: formatShortDate(data.range.to, locale, data.range.timezone),
  });
}

function getDisplayUser(
  data: UsageShareCardData,
  privacy: UsageShareCardPrivacy,
  t: TranslationFn,
) {
  if (privacy.hideUsername) {
    return t("card.anonymousUser");
  }

  return `@${data.username}`;
}

function getProjectLabel(
  data: UsageShareCardData,
  privacy: UsageShareCardPrivacy,
  t: TranslationFn,
) {
  if (privacy.hideProjectNames) {
    return t("card.hiddenProject");
  }

  return data.leaders.project?.label ?? t("card.notAvailable");
}

function getInsightText(
  data: UsageShareCardData,
  _privacy: UsageShareCardPrivacy,
  locale: string,
  t: TranslationFn,
) {
  switch (data.insight.kind) {
    case "reasoning_share":
      return t("insights.reasoningShare", {
        value: formatPercentage(data.insight.share, locale),
      });
    case "cache_share":
      return t("insights.cacheShare", {
        value: formatPercentage(data.insight.share, locale),
      });
    case "project_focus":
      return t("insights.projectFocus", {
        value: formatPercentage(data.insight.share, locale),
      });
    case "model_focus":
      return t("insights.modelFocus", {
        model: data.insight.label ?? t("card.notAvailable"),
        value: formatPercentage(data.insight.share, locale),
      });
    case "model_variety":
      return t("insights.modelVariety", {
        count: data.insight.count,
      });
    case "session_count":
      return t("insights.sessionCount", {
        count: data.insight.count,
      });
    default:
      return t("insights.activeTime", {
        value: formatDuration(data.insight.seconds),
      });
  }
}

function getDeltaText(data: UsageShareCardData, t: TranslationFn) {
  if (data.tokensDelta > 0) {
    return t("card.deltaUp", {
      value: formatTokenCount(data.tokensDelta),
    });
  }

  if (data.tokensDelta < 0) {
    return t("card.deltaDown", {
      value: formatTokenCount(Math.abs(data.tokensDelta)),
    });
  }

  return t("card.deltaNeutral");
}

function getPersonaBadgeKey(persona: UsageShareCardPersona) {
  return `personas.${persona}.title`;
}

function getPersonaDescriptionKey(persona: UsageShareCardPersona) {
  return `personas.${persona}.description`;
}

function MetricTile({
  label,
  value,
  meta,
  accent,
  className,
  bodyClassName,
  microClassName,
}: {
  label: string;
  value: string;
  meta?: string;
  accent: string;
  className?: string;
  bodyClassName: string;
  microClassName: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/12 bg-white/8 p-4 text-white/92 shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-sm",
        className,
      )}
    >
      <div className={cn("text-white/64", microClassName)}>{label}</div>
      <div className={cn("mt-2 font-semibold tracking-tight", bodyClassName)}>
        {value}
      </div>
      {meta ? (
        <div className={cn("mt-2 text-white/72", microClassName)}>{meta}</div>
      ) : null}
      <div
        className="mt-4 h-1.5 rounded-full"
        style={{ backgroundColor: accent, opacity: 0.7 }}
      />
    </div>
  );
}

function TrendBars({
  data,
  accent,
  size,
}: {
  data: UsageShareCardData["trend"];
  accent: string;
  size: keyof typeof sizePresets;
}) {
  const maxValue = Math.max(...data.map((point) => point.totalTokens), 1);

  return (
    <div className="flex h-full items-end gap-2">
      {data.map((point, _index) => {
        const height = Math.max((point.totalTokens / maxValue) * 100, 10);

        return (
          <div
            key={point.label}
            className="flex min-w-0 flex-1 flex-col justify-end gap-2"
          >
            <div
              className="rounded-t-2xl"
              style={{
                height: `${height}%`,
                minHeight: size === "export" ? 30 : 16,
                background: `linear-gradient(180deg, ${accent}, rgba(255,255,255,0.12))`,
                boxShadow: `0 10px 24px ${accent}33`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function CompositionBar({
  data,
  locale,
  size,
  t,
}: {
  data: UsageShareCardData;
  locale: string;
  size: keyof typeof sizePresets;
  t: TranslationFn;
}) {
  const items = [
    {
      key: "input" as const,
      label: t("card.mix.input"),
      share: data.composition.inputShare,
      color: "#60a5fa",
    },
    {
      key: "output" as const,
      label: t("card.mix.output"),
      share: data.composition.outputShare,
      color: "#f59e0b",
    },
    {
      key: "reasoning" as const,
      label: t("card.mix.reasoning"),
      share: data.composition.reasoningShare,
      color: "#c084fc",
    },
    {
      key: "cache" as const,
      label: t("card.mix.cache"),
      share: data.composition.cacheShare,
      color: "#34d399",
    },
  ].filter((item) => item.share > 0);

  return (
    <div className="space-y-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
        {items.map((item) => (
          <div
            key={item.key}
            style={{
              width: `${Math.max(item.share * 100, 6)}%`,
              backgroundColor: item.color,
            }}
          />
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2"
          >
            <div className={cn("text-white/62", sizePresets[size].micro)}>
              {item.label}
            </div>
            <div
              className={cn(
                "mt-1 font-semibold text-white",
                sizePresets[size].body,
              )}
            >
              {formatPercentage(item.share, locale)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryTemplate({
  data,
  privacy,
  locale,
  size,
  t,
}: {
  data: UsageShareCardData;
  privacy: UsageShareCardPrivacy;
  locale: string;
  size: keyof typeof sizePresets;
  t: TranslationFn;
}) {
  const tone = paletteMap[data.persona];

  return (
    <div className="grid h-full gap-5 xl:grid-cols-[1.25fr_0.95fr]">
      <div className="flex flex-col justify-between gap-5">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className={cn("text-white/72", sizePresets[size].body)}>
              {t("card.mainTitle")}
            </div>
            <div
              className={cn(
                "font-semibold tracking-tight text-white",
                sizePresets[size].hero,
              )}
            >
              {formatTokenCount(data.totalTokens)}
            </div>
            <div
              className={cn(
                "font-medium text-white/78",
                sizePresets[size].body,
              )}
            >
              {t("card.tokenLabel")}
            </div>
            <div className={cn("text-white/62", sizePresets[size].body)}>
              {getDeltaText(data, t)}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/12 bg-black/14 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            <div
              className={cn(
                "flex items-center gap-2 text-white/70",
                sizePresets[size].micro,
              )}
            >
              <Sparkles className={size === "export" ? "size-5" : "size-4"} />
              {t("card.insight")}
            </div>
            <div
              className={cn(
                "mt-3 font-medium text-white",
                sizePresets[size].body,
              )}
            >
              {getInsightText(data, privacy, locale, t)}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={cn("text-white/70", sizePresets[size].micro)}>
            {t("card.composition")}
          </div>
          <CompositionBar data={data} locale={locale} size={size} t={t} />
        </div>
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-rows-[auto_1fr_auto]">
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricTile
            label={t("card.cost")}
            value={
              privacy.hideCost || data.estimatedCostUsd <= 0
                ? t("card.privateValue")
                : formatUsdAmount(data.estimatedCostUsd, locale, {
                    compact: true,
                  })
            }
            accent={tone.accent}
            bodyClassName={sizePresets[size].metric}
            microClassName={sizePresets[size].micro}
          />
          <MetricTile
            label={t("card.activeTime")}
            value={formatDuration(data.activeSeconds, { compact: true })}
            accent={tone.accent}
            bodyClassName={sizePresets[size].metric}
            microClassName={sizePresets[size].micro}
          />
          <MetricTile
            label={t("card.sessions")}
            value={String(data.sessions)}
            accent={tone.accent}
            bodyClassName={sizePresets[size].metric}
            microClassName={sizePresets[size].micro}
          />
          <MetricTile
            label={t("card.messages")}
            value={String(data.messages)}
            accent={tone.accent}
            bodyClassName={sizePresets[size].metric}
            microClassName={sizePresets[size].micro}
          />
        </div>

        <div className="rounded-[30px] border border-white/12 bg-white/6 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.14)]">
          <div
            className={cn(
              "flex items-center gap-2 text-white/70",
              sizePresets[size].micro,
            )}
          >
            <Layers3 className={size === "export" ? "size-5" : "size-4"} />
            {t("card.trend")}
          </div>
          <div className="mt-4 h-[220px] sm:h-[250px] xl:h-full">
            <TrendBars data={data.trend} accent={tone.accent} size={size} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricTile
            label={t("card.topModel")}
            value={data.leaders.model?.label ?? t("card.notAvailable")}
            meta={
              data.leaders.model
                ? t("card.shareOfWork", {
                    value: formatPercentage(data.leaders.model.share, locale),
                  })
                : undefined
            }
            accent={tone.accent}
            bodyClassName={sizePresets[size].body}
            microClassName={sizePresets[size].micro}
          />
          <MetricTile
            label={t("card.topTool")}
            value={data.leaders.tool?.label ?? t("card.notAvailable")}
            meta={
              data.leaders.tool
                ? t("card.shareOfWork", {
                    value: formatPercentage(data.leaders.tool.share, locale),
                  })
                : undefined
            }
            accent={tone.accent}
            bodyClassName={sizePresets[size].body}
            microClassName={sizePresets[size].micro}
          />
          <MetricTile
            label={t("card.topProject")}
            value={getProjectLabel(data, privacy, t)}
            meta={
              data.leaders.project
                ? t("card.shareOfWork", {
                    value: formatPercentage(data.leaders.project.share, locale),
                  })
                : undefined
            }
            accent={tone.accent}
            bodyClassName={sizePresets[size].body}
            microClassName={sizePresets[size].micro}
          />
        </div>
      </div>
    </div>
  );
}

function PersonaFact({
  icon,
  label,
  value,
  size,
  accentSoft,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  size: keyof typeof sizePresets;
  accentSoft: string;
}) {
  return (
    <div
      className="rounded-[28px] border border-white/12 p-4"
      style={{ backgroundColor: accentSoft }}
    >
      <div className="flex items-center gap-3 text-white/82">
        {icon}
        <span
          className={cn("font-medium text-white/72", sizePresets[size].micro)}
        >
          {label}
        </span>
      </div>
      <div
        className={cn("mt-3 font-semibold text-white", sizePresets[size].body)}
      >
        {value}
      </div>
    </div>
  );
}

function PersonaTemplate({
  data,
  privacy,
  locale,
  size,
  t,
}: {
  data: UsageShareCardData;
  privacy: UsageShareCardPrivacy;
  locale: string;
  size: keyof typeof sizePresets;
  t: TranslationFn;
}) {
  const tone = paletteMap[data.persona];

  return (
    <div className="grid h-full gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="flex flex-col justify-between gap-5">
        <div className="space-y-5">
          <div className={cn("text-white/68", sizePresets[size].body)}>
            {t("card.personaLabel")}
          </div>
          <div
            className={cn(
              "font-semibold tracking-tight text-white",
              sizePresets[size].title,
            )}
          >
            {t(getPersonaBadgeKey(data.persona))}
          </div>
          <div
            className={cn("max-w-3xl text-white/78", sizePresets[size].body)}
          >
            {t(getPersonaDescriptionKey(data.persona))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PersonaFact
            icon={<Brain className={size === "export" ? "size-6" : "size-4"} />}
            label={t("card.mix.reasoning")}
            value={formatPercentage(data.composition.reasoningShare, locale)}
            size={size}
            accentSoft={tone.accentSoft}
          />
          <PersonaFact
            icon={
              <Activity className={size === "export" ? "size-6" : "size-4"} />
            }
            label={t("card.activeTime")}
            value={formatDuration(data.activeSeconds)}
            size={size}
            accentSoft={tone.accentSoft}
          />
          <PersonaFact
            icon={
              <Wrench className={size === "export" ? "size-6" : "size-4"} />
            }
            label={t("card.topTool")}
            value={data.leaders.tool?.label ?? t("card.notAvailable")}
            size={size}
            accentSoft={tone.accentSoft}
          />
          <PersonaFact
            icon={
              <FolderGit2 className={size === "export" ? "size-6" : "size-4"} />
            }
            label={t("card.topProject")}
            value={getProjectLabel(data, privacy, t)}
            size={size}
            accentSoft={tone.accentSoft}
          />
        </div>
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-rows-[auto_auto_1fr]">
        <div className="rounded-[30px] border border-white/12 bg-black/14 p-5">
          <div className={cn("text-white/64", sizePresets[size].micro)}>
            {t("card.personaInsightLabel")}
          </div>
          <div
            className={cn(
              "mt-3 font-medium text-white",
              sizePresets[size].body,
            )}
          >
            {getInsightText(data, privacy, locale, t)}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricTile
            label={t("card.topModel")}
            value={data.leaders.model?.label ?? t("card.notAvailable")}
            accent={tone.accent}
            bodyClassName={sizePresets[size].body}
            microClassName={sizePresets[size].micro}
          />
          <MetricTile
            label={t("card.sessions")}
            value={String(data.sessions)}
            accent={tone.accent}
            bodyClassName={sizePresets[size].body}
            microClassName={sizePresets[size].micro}
          />
          <MetricTile
            label={t("card.cost")}
            value={
              privacy.hideCost || data.estimatedCostUsd <= 0
                ? t("card.privateValue")
                : formatUsdAmount(data.estimatedCostUsd, locale, {
                    compact: true,
                  })
            }
            accent={tone.accent}
            bodyClassName={sizePresets[size].body}
            microClassName={sizePresets[size].micro}
          />
        </div>

        <div className="rounded-[30px] border border-white/12 bg-white/6 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.14)]">
          <div
            className={cn(
              "flex items-center gap-2 text-white/70",
              sizePresets[size].micro,
            )}
          >
            <MessagesSquare
              className={size === "export" ? "size-5" : "size-4"}
            />
            {t("card.currentView")}
          </div>
          <div className="mt-4 h-[220px] sm:h-[250px] xl:h-full">
            <TrendBars data={data.trend} accent={tone.accent} size={size} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** English-only thermal receipt microcopy (avoids locale bundle drift). */
const RECEIPT_THERMAL_MICROCOPY = {
  datePrefix: "DATE:",
} as const;

const TOKEN_ARENA_SITE_URL = "https://token.poco-ai.com";

function buildProfileAbsoluteUrl(locale: string, username: string): string {
  const path = `/${locale}/u/${encodeURIComponent(username)}`;
  const absolute = buildAbsoluteUrl(path);
  if (absolute) {
    return absolute;
  }
  return `${TOKEN_ARENA_SITE_URL.replace(/\/$/, "")}${path}`;
}

/** Deterministic 0–1 jitter from an integer seed (stable across SSR/client). */
function tearNoise01(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453123;
  return x - Math.floor(x);
}

/** Format a percentage to 4 decimal places so SSR and client emit identical strings. */
function pct(n: number): string {
  return `${n.toFixed(4)}%`;
}

/**
 * Soft torn-paper clip-path: shallow bites + irregular depth (not a perfect zigzag).
 */
function buildThermalReceiptClipPath(
  teeth: number,
  maxDepthPct: number,
): string {
  const pts: string[] = [];
  const maxD = maxDepthPct;

  const valleyDepth = (i: number, phase: number) => {
    const body = 0.22 + 0.78 * tearNoise01(i * 17 + phase);
    const dip = tearNoise01(i * 41 + phase) > 0.88 ? 0.58 : 1;
    return maxD * body * dip;
  };

  const peakDepth = (i: number, phase: number) =>
    maxD * (0.015 + 0.14 * tearNoise01(i * 29 + phase));

  let topLeftY = 0;

  for (let i = 0; i <= teeth; i++) {
    const x = (i / teeth) * 100;
    const y = i % 2 === 0 ? valleyDepth(i, 11) : peakDepth(i, 103);
    if (i === 0) {
      topLeftY = y;
    }
    pts.push(`${pct(x)} ${pct(y)}`);
  }

  pts.push("100% 100%");

  for (let i = teeth; i >= 0; i--) {
    const x = (i / teeth) * 100;
    const depth = i % 2 === 0 ? valleyDepth(i, 67) : peakDepth(i, 179);
    pts.push(`${pct(x)} ${pct(100 - depth)}`);
  }

  pts.push(`0% ${pct(topLeftY)}`);

  return `polygon(${pts.join(", ")})`;
}

const mmddFormatterCache = new Map<string, Intl.DateTimeFormat>();

function formatMmddInTimezone(iso: string, timeZone: string): string {
  const instant = new Date(iso);
  let formatter = mmddFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = Intl.DateTimeFormat("en-CA", {
      timeZone,
      month: "2-digit",
      day: "2-digit",
    });
    mmddFormatterCache.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(instant);
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${month}${day}`;
}

function formatThermalReceiptDateRange(data: UsageShareCardData): string {
  const tz = data.range.timezone;
  const from = formatMmddInTimezone(data.range.from, tz);
  const to = formatMmddInTimezone(data.range.to, tz);
  return `${from}-${to}`;
}

function ReceiptLine({
  label,
  value,
  strong = false,
  size,
}: {
  label: string;
  value: string;
  strong?: boolean;
  size: keyof typeof sizePresets;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-baseline justify-between gap-4 font-mono tabular-nums",
        size === "export" ? "text-[24px]" : "text-[13px] sm:text-[15px]",
        strong
          ? "font-bold text-[var(--receipt-paper-fg-strong)]"
          : "font-medium text-[var(--receipt-paper-fg)]",
      )}
    >
      <span className="min-w-0 flex-1 truncate uppercase">{label}</span>
      <span className="max-w-[min(14rem,calc(100%-6rem))] shrink-0 truncate text-right uppercase">
        {value}
      </span>
    </div>
  );
}

function ReceiptBarcode({
  value,
  size,
  ariaLabel,
}: {
  value: string;
  size: keyof typeof sizePresets;
  ariaLabel: string;
}) {
  const bars = Array.from(value).flatMap((char, index) => {
    const code = char.charCodeAt(0) + index * 17;
    return [1 + (code % 3), 1, 2 + (code % 2), 1];
  });

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn(
        "flex w-full justify-center overflow-hidden text-[var(--receipt-paper-fg-strong)]",
        size === "export" ? "h-[62px] gap-1" : "h-9 gap-0.5 sm:h-10",
      )}
    >
      {bars.slice(0, 96).map((width, index) => (
        // react-doctor-disable-next-line react-doctor/no-array-index-as-key -- bars are deterministically derived from value, order never changes
        <span
          key={`bar-${index}`}
          className="h-full bg-current"
          style={{ width }}
        />
      ))}
    </div>
  );
}

const MAX_RECEIPT_MODEL_ROWS = 14;

function ReceiptTemplate({
  data,
  privacy,
  locale,
  size,
  className,
  t,
}: {
  data: UsageShareCardData;
  privacy: UsageShareCardPrivacy;
  locale: string;
  size: keyof typeof sizePresets;
  className?: string;
  t: TranslationFn;
}) {
  const displayUser = getDisplayUser(data, privacy, t);
  const cost = formatUsdAmount(data.estimatedCostUsd, locale, {
    compact: true,
  });
  const receiptClassName =
    size === "export"
      ? "w-[620px] px-14 py-12"
      : "w-full max-w-[360px] px-5 py-5 sm:max-w-[390px] sm:px-6 sm:py-6";

  const profileBarcodeUrl = privacy.hideUsername
    ? null
    : buildProfileAbsoluteUrl(locale, data.username);

  const rows = [
    {
      label: t("receipt.fields.user"),
      value: displayUser,
    },
    {
      label: t("receipt.fields.activeTime"),
      value: formatDuration(data.activeSeconds, { compact: true }),
    },
    {
      label: t("receipt.fields.sessions"),
      value: String(data.sessions),
    },
    {
      label: t("receipt.fields.messages"),
      value: String(data.messages),
    },
  ];

  const modelUsage = data.modelUsage ?? [];
  const modelReceiptLines =
    modelUsage.length === 0
      ? [
          {
            label: t("receipt.fields.modelsTag"),
            value: t("card.notAvailable"),
          },
        ]
      : modelUsage.length <= MAX_RECEIPT_MODEL_ROWS
        ? modelUsage.map((row) => ({
            label: row.label,
            value: formatTokenCount(row.totalTokens, locale),
          }))
        : [
            ...modelUsage.slice(0, MAX_RECEIPT_MODEL_ROWS - 1).map((row) => ({
              label: row.label,
              value: formatTokenCount(row.totalTokens, locale),
            })),
            {
              label: t("receipt.fields.otherModels"),
              value: formatTokenCount(
                modelUsage
                  .slice(MAX_RECEIPT_MODEL_ROWS - 1)
                  .reduce((sum, row) => sum + row.totalTokens, 0),
                locale,
              ),
            },
          ];

  const tornClipPath =
    size === "export"
      ? buildThermalReceiptClipPath(58, 0.88)
      : buildThermalReceiptClipPath(46, 0.95);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center text-[var(--receipt-paper-fg-strong)]",
        size === "preview"
          ? "w-full min-h-0 max-w-[760px]"
          : "flex w-[1200px] shrink-0 justify-center overflow-visible py-16",
        className,
      )}
    >
      <div
        className={cn(
          "relative bg-[var(--receipt-paper-bg)]",
          receiptClassName,
        )}
        style={{
          clipPath: tornClipPath,
          WebkitClipPath: tornClipPath,
        }}
      >
        <div className="relative">
          <div className="flex items-center justify-between gap-3 font-mono sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              {size === "export" ? (
                <Image
                  src="/logo_dark.svg"
                  alt=""
                  width={56}
                  height={56}
                  draggable={false}
                  unoptimized
                  className="size-14 shrink-0 select-none"
                />
              ) : (
                <>
                  <Image
                    src="/logo_dark.svg"
                    alt=""
                    width={36}
                    height={36}
                    draggable={false}
                    unoptimized
                    className="block size-9 shrink-0 select-none sm:size-10 dark:hidden"
                  />
                  <Image
                    src="/logo_white.svg"
                    alt=""
                    width={36}
                    height={36}
                    draggable={false}
                    unoptimized
                    className="hidden size-9 shrink-0 select-none sm:size-10 dark:block"
                  />
                </>
              )}
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "font-black tracking-tight text-[var(--receipt-paper-fg-strong)] uppercase",
                    size === "export" ? "text-[30px]" : "text-base",
                  )}
                >
                  Token Arena
                </div>
                <div
                  className={cn(
                    "mt-2 font-semibold text-[var(--receipt-paper-fg-soft)] uppercase tracking-wide",
                    size === "export"
                      ? "text-[13px] leading-snug"
                      : "text-[9px] leading-snug sm:text-[10px]",
                  )}
                >
                  {RECEIPT_THERMAL_MICROCOPY.datePrefix}{" "}
                  {formatThermalReceiptDateRange(data)}
                </div>
              </div>
            </div>
            <div className="shrink-0" title={TOKEN_ARENA_SITE_URL}>
              <QRCode
                value={TOKEN_ARENA_SITE_URL}
                size={size === "export" ? 72 : 44}
                fgColor="currentColor"
                bgColor="transparent"
                className="text-[var(--receipt-paper-fg-strong)]"
                style={{ display: "block" }}
              />
            </div>
          </div>

          <div className="my-5 border-[var(--receipt-paper-border)] border-t" />

          <div className="space-y-2.5">
            {rows.map((row) => (
              <ReceiptLine
                key={row.label}
                label={row.label}
                value={row.value}
                size={size}
              />
            ))}
          </div>

          <div className="my-5 border-[var(--receipt-paper-border)] border-t" />

          <div className="space-y-2.5">
            {modelReceiptLines.map((row, _index) => (
              <ReceiptLine
                key={`model-row-${row.label}`}
                label={row.label}
                value={row.value}
                size={size}
              />
            ))}
          </div>

          <div className="my-5 border-[var(--receipt-paper-border)] border-t" />

          <div className="space-y-2.5">
            <ReceiptLine
              label={t("receipt.fields.totalTokens")}
              value={formatTokenCount(data.totalTokens, locale)}
              strong
              size={size}
            />
            {!privacy.hideCost && data.estimatedCostUsd > 0 ? (
              <ReceiptLine
                label={t("receipt.fields.cost")}
                value={cost}
                strong
                size={size}
              />
            ) : null}
          </div>

          {profileBarcodeUrl ? (
            <div className="mt-6">
              <ReceiptBarcode
                value={profileBarcodeUrl}
                size={size}
                ariaLabel={`@${data.username}`}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function UsageShareCardPreview({
  data,
  template,
  privacy,
  locale,
  size = "preview",
  className,
}: UsageShareCardPreviewProps) {
  const t = useTranslations("usage.share");
  const tone = paletteMap[data.persona];
  const displayUser = getDisplayUser(data, privacy, t);

  if (template === "receipt") {
    return (
      <ReceiptTemplate
        data={data}
        privacy={privacy}
        locale={locale}
        size={size}
        className={className}
        t={t}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[32px] text-white shadow-[0_30px_120px_rgba(0,0,0,0.35)]",
        sizePresets[size].root,
        className,
      )}
      style={{
        background: `radial-gradient(circle at 15% 18%, ${tone.glowA}, transparent 32%), radial-gradient(circle at 84% 0%, ${tone.glowB}, transparent 28%), linear-gradient(135deg, ${tone.from}, ${tone.to})`,
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(transparent,rgba(255,255,255,0.02))]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div
        className={cn(
          "relative flex h-full flex-col",
          sizePresets[size].padding,
        )}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div
              className={cn(
                "font-semibold tracking-[0.24em] uppercase text-white/78",
                sizePresets[size].micro,
              )}
            >
              Token Arena
            </div>
            <div className={cn("mt-2 text-white/62", sizePresets[size].micro)}>
              {t("card.footer")}
            </div>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "rounded-full border-white/18 bg-white/10 text-white",
              sizePresets[size].pill,
            )}
            style={{ backgroundColor: tone.chip }}
          >
            {getRangeLabel(data, locale, t)}
          </Badge>
        </div>

        <div className="flex-1">
          {template === "persona" ? (
            <PersonaTemplate
              data={data}
              privacy={privacy}
              locale={locale}
              size={size}
              t={t}
            />
          ) : (
            <SummaryTemplate
              data={data}
              privacy={privacy}
              locale={locale}
              size={size}
              t={t}
            />
          )}
        </div>

        <div className="mt-6 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
          <div className="space-y-2">
            <div className={cn("text-white/64", sizePresets[size].micro)}>
              {displayUser}
            </div>
            <div
              className={cn(
                "flex items-center gap-2 text-white/78",
                sizePresets[size].micro,
              )}
            >
              <Sparkles className={size === "export" ? "size-4" : "size-3.5"} />
              {t("card.currentView")}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full border-white/18 bg-white/10 text-white",
                sizePresets[size].pill,
              )}
            >
              {t(getPersonaBadgeKey(data.persona))}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
