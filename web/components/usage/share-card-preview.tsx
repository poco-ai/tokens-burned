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
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
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

function formatShortDate(value: string, locale: string, timezone: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: timezone,
  }).format(new Date(value));
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
      {data.map((point, index) => {
        const height = Math.max((point.totalTokens / maxValue) * 100, 10);

        return (
          <div
            key={`${point.label}-${index}`}
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

export function buildUsageShareCardCaption(input: {
  data: UsageShareCardData;
  template: UsageShareCardTemplate;
  privacy: UsageShareCardPrivacy;
  locale: string;
  t: TranslationFn;
}) {
  const user = getDisplayUser(input.data, input.privacy, input.t);
  const period = getRangeLabel(input.data, input.locale, input.t).toLowerCase();
  const insight = getInsightText(
    input.data,
    input.privacy,
    input.locale,
    input.t,
  );

  if (input.template === "persona") {
    return input.t("captions.persona", {
      user,
      persona: input.t(getPersonaBadgeKey(input.data.persona)),
      insight,
      period,
    });
  }

  return input.t("captions.summary", {
    user,
    totalTokens: formatTokenCount(input.data.totalTokens),
    period,
    insight,
  });
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
