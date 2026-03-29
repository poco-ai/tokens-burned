import type {
  DashboardPreset,
  DashboardRange,
  TokenTrendPoint,
  UsageBreakdowns,
  UsageFilters,
  UsageOverviewMetrics,
  UsagePricingSummary,
} from "@/lib/usage/types";

export const usageShareCardTemplates = ["summary", "persona"] as const;
export type UsageShareCardTemplate = (typeof usageShareCardTemplates)[number];

export const usageShareCardPersonas = [
  "reasoning_master",
  "cache_guardian",
  "project_deep_diver",
  "model_orchestrator",
  "rapid_shipper",
  "steady_builder",
] as const;
export type UsageShareCardPersona = (typeof usageShareCardPersonas)[number];

export type UsageShareCardPeriod = "day" | "week" | "month" | "custom";

export type UsageShareCardLeader = {
  label: string;
  share: number;
  totalTokens: number;
} | null;

export type UsageShareCardInsight =
  | {
      kind: "reasoning_share";
      share: number;
    }
  | {
      kind: "cache_share";
      share: number;
    }
  | {
      kind: "project_focus";
      share: number;
      label: string | null;
    }
  | {
      kind: "model_focus";
      share: number;
      label: string | null;
    }
  | {
      kind: "model_variety";
      count: number;
    }
  | {
      kind: "session_count";
      count: number;
    }
  | {
      kind: "active_time";
      seconds: number;
    };

export type UsageShareCardData = {
  username: string;
  period: UsageShareCardPeriod;
  range: {
    preset: DashboardPreset;
    from: string;
    to: string;
    timezone: string;
  };
  filters: UsageFilters;
  totalTokens: number;
  tokensDelta: number;
  estimatedCostUsd: number;
  activeSeconds: number;
  totalSeconds: number;
  sessions: number;
  messages: number;
  composition: {
    inputShare: number;
    outputShare: number;
    reasoningShare: number;
    cacheShare: number;
  };
  leaders: {
    model: UsageShareCardLeader;
    tool: UsageShareCardLeader;
    project: UsageShareCardLeader;
  };
  diversity: {
    models: number;
    tools: number;
    projects: number;
  };
  persona: UsageShareCardPersona;
  insight: UsageShareCardInsight;
  trend: Array<{
    label: string;
    totalTokens: number;
    estimatedCostUsd: number;
    totalSeconds: number;
  }>;
};

function safeRatio(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return value / total;
}

function getPeriodFromPreset(preset: DashboardPreset): UsageShareCardPeriod {
  switch (preset) {
    case "1d":
      return "day";
    case "30d":
      return "month";
    case "custom":
      return "custom";
    default:
      return "week";
  }
}

function getLeader(
  rows: Array<{ name: string; totalTokens: number; share: number }>,
): UsageShareCardLeader {
  const leader = rows.find((row) => row.totalTokens > 0);

  if (!leader) {
    return null;
  }

  return {
    label: leader.name,
    share: leader.share,
    totalTokens: leader.totalTokens,
  };
}

function compressTrend(points: TokenTrendPoint[], maxPoints = 12) {
  if (points.length <= maxPoints) {
    return points.map((point) => ({
      label: point.label,
      totalTokens: point.totalTokens,
      estimatedCostUsd: point.estimatedCostUsd,
      totalSeconds: point.totalSeconds,
    }));
  }

  const chunkSize = Math.ceil(points.length / maxPoints);
  const compressed = [] as UsageShareCardData["trend"];

  for (let index = 0; index < points.length; index += chunkSize) {
    const slice = points.slice(index, index + chunkSize);

    compressed.push({
      label: slice.at(-1)?.label ?? slice[0]?.label ?? "",
      totalTokens: slice.reduce((sum, point) => sum + point.totalTokens, 0),
      estimatedCostUsd: slice.reduce(
        (sum, point) => sum + point.estimatedCostUsd,
        0,
      ),
      totalSeconds: slice.reduce((sum, point) => sum + point.totalSeconds, 0),
    });
  }

  return compressed;
}

function resolvePersona(input: {
  reasoningShare: number;
  cacheShare: number;
  topProjectShare: number;
  topModelShare: number;
  modelDiversity: number;
  sessions: number;
  averageTokensPerSession: number;
}): UsageShareCardPersona {
  if (input.reasoningShare >= 0.28) {
    return "reasoning_master";
  }

  if (input.cacheShare >= 0.18) {
    return "cache_guardian";
  }

  if (input.topProjectShare >= 0.68) {
    return "project_deep_diver";
  }

  if (input.modelDiversity >= 3 && input.topModelShare <= 0.62) {
    return "model_orchestrator";
  }

  if (input.sessions >= 10 && input.averageTokensPerSession <= 120_000) {
    return "rapid_shipper";
  }

  return "steady_builder";
}

function resolveInsight(input: {
  persona: UsageShareCardPersona;
  reasoningShare: number;
  cacheShare: number;
  topProject: UsageShareCardLeader;
  topModel: UsageShareCardLeader;
  modelDiversity: number;
  sessions: number;
  activeSeconds: number;
}): UsageShareCardInsight {
  switch (input.persona) {
    case "reasoning_master":
      return {
        kind: "reasoning_share",
        share: input.reasoningShare,
      };
    case "cache_guardian":
      return {
        kind: "cache_share",
        share: input.cacheShare,
      };
    case "project_deep_diver":
      return {
        kind: "project_focus",
        share: input.topProject?.share ?? 0,
        label: input.topProject?.label ?? null,
      };
    case "model_orchestrator":
      return input.modelDiversity >= 2
        ? {
            kind: "model_variety",
            count: input.modelDiversity,
          }
        : {
            kind: "model_focus",
            share: input.topModel?.share ?? 0,
            label: input.topModel?.label ?? null,
          };
    case "rapid_shipper":
      return {
        kind: "session_count",
        count: input.sessions,
      };
    default:
      return {
        kind: "active_time",
        seconds: input.activeSeconds,
      };
  }
}

export function buildUsageShareCardData(input: {
  username: string;
  range: DashboardRange;
  filters: UsageFilters;
  overview: UsageOverviewMetrics;
  pricingSummary?: UsagePricingSummary;
  breakdowns: UsageBreakdowns;
  tokenTrend: TokenTrendPoint[];
}): UsageShareCardData {
  const totalTokens = input.overview.totalTokens.current;
  const inputShare = safeRatio(input.overview.inputTokens.current, totalTokens);
  const outputShare = safeRatio(
    input.overview.outputTokens.current,
    totalTokens,
  );
  const reasoningShare = safeRatio(
    input.overview.reasoningTokens.current,
    totalTokens,
  );
  const cacheShare = safeRatio(
    input.overview.cachedTokens.current,
    totalTokens,
  );
  const topProject = getLeader(input.breakdowns.projects);
  const topModel = getLeader(input.breakdowns.models);
  const topTool = getLeader(input.breakdowns.tools);
  const modelDiversity = input.breakdowns.models.filter(
    (row) => row.totalTokens > 0,
  ).length;
  const averageTokensPerSession = safeRatio(
    totalTokens,
    Math.max(input.overview.sessions.current, 1),
  );
  const persona = resolvePersona({
    reasoningShare,
    cacheShare,
    topProjectShare: topProject?.share ?? 0,
    topModelShare: topModel?.share ?? 0,
    modelDiversity,
    sessions: input.overview.sessions.current,
    averageTokensPerSession,
  });

  return {
    username: input.username,
    period: getPeriodFromPreset(input.range.preset),
    range: {
      preset: input.range.preset,
      from: input.range.from.toISOString(),
      to: input.range.to.toISOString(),
      timezone: input.range.timezone,
    },
    filters: input.filters,
    totalTokens,
    tokensDelta: input.overview.totalTokens.delta,
    estimatedCostUsd: input.pricingSummary?.currentUsd ?? 0,
    activeSeconds: input.overview.activeSeconds.current,
    totalSeconds: input.overview.totalSeconds.current,
    sessions: input.overview.sessions.current,
    messages: input.overview.messages.current,
    composition: {
      inputShare,
      outputShare,
      reasoningShare,
      cacheShare,
    },
    leaders: {
      model: topModel,
      tool: topTool,
      project: topProject,
    },
    diversity: {
      models: modelDiversity,
      tools: input.breakdowns.tools.filter((row) => row.totalTokens > 0).length,
      projects: input.breakdowns.projects.filter((row) => row.totalTokens > 0)
        .length,
    },
    persona,
    insight: resolveInsight({
      persona,
      reasoningShare,
      cacheShare,
      topProject,
      topModel,
      modelDiversity,
      sessions: input.overview.sessions.current,
      activeSeconds: input.overview.activeSeconds.current,
    }),
    trend: compressTrend(input.tokenTrend),
  };
}
