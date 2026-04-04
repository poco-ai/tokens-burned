import { computeCurrentStreak } from "@/lib/achievements/evaluate";
import { normalizeUsername } from "@/lib/auth-username";
import { getPricingCatalog } from "@/lib/pricing/catalog";
import {
  estimateCostUsd,
  resolveOfficialPricingMatch,
} from "@/lib/pricing/resolve";
import { prisma } from "@/lib/prisma";
import { tokenCountToNumber } from "@/lib/token-counts";
import { formatDateInput } from "@/lib/usage/format";

export const publicBadgeMetrics = [
  "streak",
  "tokens",
  "active_time",
  "total_time",
  "cost",
] as const;

export type PublicBadgeMetric = (typeof publicBadgeMetrics)[number];
export type PublicBadgeTheme = "light" | "dark";
export type PublicBadgeStyle =
  | "flat"
  | "flat-square"
  | "plastic"
  | "for-the-badge";

export type PublicBadgeData = {
  username: string;
  publicProfileEnabled: boolean;
  totalTokens: number;
  estimatedCostUsd: number;
  activeSeconds: number;
  totalSeconds: number;
  sessions: number;
  currentStreakDays: number;
};

export type PublicBadgeState =
  | {
      kind: "ok";
      data: PublicBadgeData;
    }
  | {
      kind: "private";
      username: string;
    }
  | {
      kind: "not_found";
      username: string;
    };

export type BadgeRenderConfig = {
  metric: PublicBadgeMetric;
  label?: string | null;
  theme: PublicBadgeTheme;
  style: PublicBadgeStyle;
};

type BadgeStyleSpec = {
  radius: number;
  height: number;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  paddingX: number;
  charWidth: number;
  labelCharWidth: number;
  labelSafetyPadding: number;
  dividerOpacity: number;
  addGloss: boolean;
  logoBlockWidth: number;
  gapAfterLogo: number;
  minLabelWidth: number;
  minValueWidth: number;
  logoScale: number;
};

export const TOKEN_ARENA_LOGO_PATHS = {
  secondary:
    "M676.41 762.6c17.46 17.47 28.3 41.55 28.3 68.04 0 26.51-10.84 50.59-28.3 68.06-17.47 17.46-41.55 28.3-68.06 28.3-0.67 0-1.34 0-2.01-0.01-84.89-1.08-153.4-70.23-153.4-155.4V578.88c0 36.39 12.51 69.87 33.47 96.35 28.46 35.97 72.51 59.06 121.94 59.06 26.51 0 50.59 10.84 68.06 28.31z",
  primary:
    "M452.94 771.59c0 85.16 68.5 154.32 153.4 155.4-55.11-0.31-107.18-13.43-153.4-36.52-114.26-57.1-192.71-175.18-192.71-311.59V193.36c0-53 43.37-96.35 96.35-96.35 53 0 96.35 43.35 96.35 96.35v37.4H667.4c22.42 0 43.1 7.76 59.53 20.73 22.39 17.68 36.83 45.06 36.83 75.63 0 26.51-10.84 50.59-28.3 68.06-17.47 17.46-41.55 28.3-68.06 28.3H452.94v348.11z",
} as const;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getBadgeStyleSpec(style: PublicBadgeStyle): BadgeStyleSpec {
  switch (style) {
    case "flat-square":
      return {
        radius: 0,
        height: 20,
        fontSize: 11,
        fontWeight: "600",
        fontFamily: "Verdana,Geneva,DejaVu Sans,sans-serif",
        paddingX: 5,
        charWidth: 6.1,
        labelCharWidth: 5.7,
        labelSafetyPadding: 8,
        dividerOpacity: 0.1,
        addGloss: false,
        logoBlockWidth: 13,
        gapAfterLogo: 3,
        minLabelWidth: 34,
        minValueWidth: 22,
        logoScale: 0.012,
      };
    case "plastic":
      return {
        radius: 4,
        height: 18,
        fontSize: 11,
        fontWeight: "600",
        fontFamily: "Verdana,Geneva,DejaVu Sans,sans-serif",
        paddingX: 5,
        charWidth: 6,
        labelCharWidth: 5.6,
        labelSafetyPadding: 8,
        dividerOpacity: 0.12,
        addGloss: true,
        logoBlockWidth: 12,
        gapAfterLogo: 3,
        minLabelWidth: 33,
        minValueWidth: 22,
        logoScale: 0.0115,
      };
    case "for-the-badge":
      return {
        radius: 0,
        height: 28,
        fontSize: 10,
        fontWeight: "700",
        fontFamily: "Verdana,Geneva,DejaVu Sans,sans-serif",
        paddingX: 8,
        charWidth: 6.7,
        labelCharWidth: 6.1,
        labelSafetyPadding: 10,
        dividerOpacity: 0.1,
        addGloss: false,
        logoBlockWidth: 18,
        gapAfterLogo: 5,
        minLabelWidth: 42,
        minValueWidth: 30,
        logoScale: 0.016,
      };
    default:
      return {
        radius: 3,
        height: 20,
        fontSize: 11,
        fontWeight: "600",
        fontFamily: "Verdana,Geneva,DejaVu Sans,sans-serif",
        paddingX: 5,
        charWidth: 6.1,
        labelCharWidth: 5.7,
        labelSafetyPadding: 8,
        dividerOpacity: 0.1,
        addGloss: false,
        logoBlockWidth: 13,
        gapAfterLogo: 3,
        minLabelWidth: 34,
        minValueWidth: 22,
        logoScale: 0.012,
      };
  }
}

function formatShortNumber(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs < 1_000) {
    return `${sign}${abs.toLocaleString("en-US")}`;
  }

  if (abs < 1_000_000) {
    return `${sign}${(abs / 1_000).toLocaleString("en-US", {
      maximumFractionDigits: 1,
    })}K`;
  }

  if (abs < 1_000_000_000) {
    return `${sign}${(abs / 1_000_000).toLocaleString("en-US", {
      maximumFractionDigits: 1,
    })}M`;
  }

  return `${sign}${(abs / 1_000_000_000).toLocaleString("en-US", {
    maximumFractionDigits: 1,
  })}B`;
}

function formatShortUsd(value: number) {
  if (value <= 0) {
    return "$0";
  }

  if (value >= 1_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }

  if (value >= 1) {
    return `$${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)}`;
  }

  if (value >= 0.01) {
    return `$${value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}`;
  }

  return `$${value.toFixed(5).replace(/0+$/, "").replace(/\.$/, "")}`;
}

function formatShortDuration(seconds: number) {
  if (seconds <= 0) {
    return "0h";
  }

  const totalHours = Math.floor(seconds / 3600);

  if (totalHours < 24) {
    return `${Math.max(1, totalHours)}h`;
  }

  const days = Math.floor(totalHours / 24);

  if (days < 365) {
    return `${days}d`;
  }

  return `${(days / 365).toLocaleString("en-US", {
    maximumFractionDigits: 1,
  })}y`;
}

function getMetricValue(data: PublicBadgeData, metric: PublicBadgeMetric) {
  switch (metric) {
    case "streak":
      return `${Math.max(0, data.currentStreakDays)}d`;
    case "tokens":
      return formatShortNumber(data.totalTokens);
    case "active_time":
      return formatShortDuration(data.activeSeconds);
    case "total_time":
      return formatShortDuration(data.totalSeconds);
    case "cost":
      return formatShortUsd(data.estimatedCostUsd);
  }
}

function estimateBucketCostUsd(bucket: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
}) {
  return async (catalog: Awaited<ReturnType<typeof getPricingCatalog>>) => {
    const match = resolveOfficialPricingMatch(catalog, bucket.model);
    const estimate = estimateCostUsd(
      {
        inputTokens: bucket.inputTokens,
        outputTokens: bucket.outputTokens,
        reasoningTokens: bucket.reasoningTokens,
        cachedTokens: bucket.cachedTokens,
      },
      match?.cost,
    );

    return estimate?.totalUsd ?? 0;
  };
}

export async function getPublicBadgeData(input: {
  username: string;
}): Promise<PublicBadgeState> {
  const username = normalizeUsername(input.username);
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      usagePreference: {
        select: {
          publicProfileEnabled: true,
          timezone: true,
        },
      },
    },
  });

  if (!user) {
    return {
      kind: "not_found",
      username,
    };
  }

  if (!user.usagePreference?.publicProfileEnabled) {
    return {
      kind: "private",
      username: user.username,
    };
  }

  const timezone = user.usagePreference?.timezone ?? "UTC";
  const [catalog, buckets, sessionSummary, sessionDays] = await Promise.all([
    getPricingCatalog(),
    prisma.usageBucket.findMany({
      where: { userId: user.id },
      select: {
        bucketStart: true,
        totalTokens: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        reasoningTokens: true,
        cachedTokens: true,
      },
      orderBy: { bucketStart: "asc" },
    }),
    prisma.usageSession.aggregate({
      where: { userId: user.id },
      _sum: {
        activeSeconds: true,
        durationSeconds: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.usageSession.findMany({
      where: { userId: user.id },
      select: {
        firstMessageAt: true,
      },
      orderBy: { firstMessageAt: "asc" },
    }),
  ]);

  let totalTokens = 0;
  let estimatedCostUsd = 0;
  const activeDayKeys = new Set<string>();

  for (const bucket of buckets) {
    const normalized = {
      totalTokens: tokenCountToNumber(bucket.totalTokens),
      inputTokens: tokenCountToNumber(bucket.inputTokens),
      outputTokens: tokenCountToNumber(bucket.outputTokens),
      reasoningTokens: tokenCountToNumber(bucket.reasoningTokens),
      cachedTokens: tokenCountToNumber(bucket.cachedTokens),
    };

    totalTokens += normalized.totalTokens;
    estimatedCostUsd += await estimateBucketCostUsd({
      model: bucket.model,
      inputTokens: normalized.inputTokens,
      outputTokens: normalized.outputTokens,
      reasoningTokens: normalized.reasoningTokens,
      cachedTokens: normalized.cachedTokens,
    })(catalog);
    activeDayKeys.add(formatDateInput(bucket.bucketStart, timezone));
  }

  for (const session of sessionDays) {
    activeDayKeys.add(formatDateInput(session.firstMessageAt, timezone));
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sortedDayKeys = Array.from(activeDayKeys).sort();

  return {
    kind: "ok",
    data: {
      username: user.username,
      publicProfileEnabled: true,
      totalTokens,
      estimatedCostUsd,
      activeSeconds: sessionSummary._sum.activeSeconds ?? 0,
      totalSeconds: sessionSummary._sum.durationSeconds ?? 0,
      sessions: sessionSummary._count._all,
      currentStreakDays: computeCurrentStreak({
        activeDayKeys: sortedDayKeys,
        todayKey: formatDateInput(now, timezone),
        yesterdayKey: formatDateInput(yesterday, timezone),
      }),
    },
  };
}

function measureBadgeText(text: string, style: BadgeStyleSpec) {
  return style.paddingX * 2 + text.length * style.charWidth;
}

function measureLabelText(text: string, style: BadgeStyleSpec) {
  return style.paddingX * 2 + text.length * style.labelCharWidth;
}

function getMetricLabel(metric: PublicBadgeMetric) {
  switch (metric) {
    case "streak":
      return "streak";
    case "tokens":
      return "tokens";
    case "active_time":
      return "active";
    case "total_time":
      return "total";
    case "cost":
      return "cost";
  }
}

export function renderBadgeSvg(
  state: PublicBadgeState,
  config: BadgeRenderConfig,
) {
  const value =
    state.kind === "ok"
      ? getMetricValue(state.data, config.metric)
      : state.kind === "private"
        ? "private"
        : "not found";
  const label = config.label?.trim() || getMetricLabel(config.metric);

  // Neutral palette aligned with web/app/globals.css (:root / .dark), hex for SVG portability.
  const palette =
    config.theme === "light"
      ? {
          left: "#f5f5f5",
          right: "#252525",
          leftText: "#252525",
          rightText: "#fafafa",
          border: "#ebebeb",
          logoPrimary: "#252525",
          logoSecondary: "#8a8a8a",
        }
      : {
          left: "#363636",
          right: "#737373",
          leftText: "#fafafa",
          rightText: "#fafafa",
          border: "#555555",
          logoPrimary: "#fafafa",
          logoSecondary: "#a3a3a3",
        };

  const styleSpec = getBadgeStyleSpec(config.style);
  const { gapAfterLogo, logoBlockWidth } = styleSpec;
  const labelWidth = Math.ceil(measureLabelText(label, styleSpec));
  const leftWidth = Math.max(
    styleSpec.minLabelWidth,
    logoBlockWidth + gapAfterLogo + labelWidth + styleSpec.labelSafetyPadding,
  );
  const rightWidth = Math.max(
    styleSpec.minValueWidth,
    Math.ceil(measureBadgeText(value, styleSpec)),
  );
  const width = leftWidth + rightWidth;
  const radius = styleSpec.radius;
  const height = styleSpec.height;
  const rightTextX = leftWidth + Math.round(rightWidth / 2);
  const textY = Math.round(height / 2);
  const logoScale = styleSpec.logoScale;
  const logoCenterX = styleSpec.paddingX + Math.round(logoBlockWidth / 2);
  const logoCenterY = Math.round(height / 2);
  const labelX = styleSpec.paddingX + logoBlockWidth + gapAfterLogo;
  const gloss = styleSpec.addGloss
    ? `
  <defs>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="48%" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="49%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.10"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height / 2}" rx="${radius}" fill="url(#gloss)"/>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="${escapeXml(
    `TokenArena ${label}: ${value}`,
  )}" viewBox="0 0 ${width} ${height}">
  <title>${escapeXml(`TokenArena ${label}: ${value}`)}</title>
  <rect width="${width}" height="${height}" rx="${radius}" fill="${palette.border}"/>
  <path d="M${radius},0.5 H${leftWidth} V${height - 0.5} H${radius} Q0.5,${
    height - 0.5
  } 0.5,${height - radius} V${radius} Q0.5,0.5 ${radius},0.5 Z" fill="${palette.left}"/>
  <path d="M${leftWidth},0.5 H${width - radius} Q${width - 0.5},0.5 ${
    width - 0.5
  },${radius} V${height - radius} Q${width - 0.5},${height - 0.5} ${
    width - radius
  },${height - 0.5} H${leftWidth} Z" fill="${palette.right}"/>
  <rect x="${leftWidth - 0.5}" y="0.5" width="1" height="${height - 1}" fill="#000000" opacity="${styleSpec.dividerOpacity}"/>
  ${gloss}
  <g transform="translate(${logoCenterX} ${logoCenterY}) scale(${logoScale}) translate(-512 -512)">
    <path d="${TOKEN_ARENA_LOGO_PATHS.secondary}" fill="${palette.logoSecondary}"/>
    <path d="${TOKEN_ARENA_LOGO_PATHS.primary}" fill="${palette.logoPrimary}"/>
  </g>
  <text x="${labelX}" y="${textY}" dominant-baseline="middle" fill="${palette.leftText}" font-family="${styleSpec.fontFamily}" font-size="${styleSpec.fontSize}" font-weight="${styleSpec.fontWeight}" text-anchor="start">${escapeXml(
    label,
  )}</text>
  <text x="${rightTextX}" y="${textY}" dominant-baseline="middle" fill="${palette.rightText}" font-family="${styleSpec.fontFamily}" font-size="${styleSpec.fontSize}" font-weight="${styleSpec.fontWeight}" text-anchor="middle">${escapeXml(
    value,
  )}</text>
</svg>`;
}

export function parsePublicBadgeMetric(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return publicBadgeMetrics.includes(value as PublicBadgeMetric)
    ? (value as PublicBadgeMetric)
    : null;
}

export function parsePublicBadgeTheme(value: string | null | undefined) {
  return value === "light" ? "light" : "dark";
}

export function parsePublicBadgeStyle(value: string | null | undefined) {
  if (
    value === "flat-square" ||
    value === "plastic" ||
    value === "for-the-badge"
  ) {
    return value;
  }

  return "flat";
}
