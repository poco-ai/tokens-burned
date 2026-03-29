export const schemaVersion = 2 as const;

export const projectModes = ["hashed", "raw", "disabled"] as const;
export type ProjectMode = (typeof projectModes)[number];

export const usageApiKeyStatuses = ["active", "disabled"] as const;
export type UsageApiKeyStatus = (typeof usageApiKeyStatuses)[number];

export const dashboardPresets = ["1d", "7d", "30d", "custom"] as const;
export type DashboardPreset = (typeof dashboardPresets)[number];

export type DashboardGranularity = "hour" | "day";

export type DashboardRange = {
  from: Date;
  to: Date;
  granularity: DashboardGranularity;
  preset: DashboardPreset;
  timezone: string;
};

export type UsageFilters = {
  apiKeyId?: string;
  deviceId?: string;
  source?: string;
  model?: string;
  projectKey?: string;
};

export type UsageMetricTotals = {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  activeSeconds: number;
  totalSeconds: number;
  sessions: number;
  messages: number;
  userMessages: number;
};

export type UsageMetricDelta = {
  current: number;
  previous: number;
  delta: number;
};

export type UsageOverviewMetrics = {
  totalTokens: UsageMetricDelta;
  inputTokens: UsageMetricDelta;
  outputTokens: UsageMetricDelta;
  reasoningTokens: UsageMetricDelta;
  cachedTokens: UsageMetricDelta;
  activeSeconds: UsageMetricDelta;
  totalSeconds: UsageMetricDelta;
  sessions: UsageMetricDelta;
  messages: UsageMetricDelta;
  userMessages: UsageMetricDelta;
};

export type TokenTrendPoint = {
  label: string;
  start: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  estimatedCostUsd: number;
  totalSeconds: number;
};

export type ActivityTrendPoint = {
  label: string;
  start: string;
  activeSeconds: number;
  totalSeconds: number;
  sessions: number;
  messages: number;
  userMessages: number;
};

export type BreakdownRow = {
  key: string;
  name: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  estimatedCostUsd: number;
  activeSeconds: number;
  totalSeconds: number;
  sessions: number;
  messages: number;
  userMessages: number;
  share: number;
};

export type UsagePricingSummary = {
  currentUsd: number;
  previousUsd: number;
  deltaUsd: number;
  pricedTokens: number;
  totalTokens: number;
  coverage: number;
  pricedModels: number;
  totalModels: number;
};

export type ModelPricingRow = {
  rawModel: string;
  pricingProviderId: string | null;
  pricingProviderName: string | null;
  matchedModelId: string | null;
  matchedModelName: string | null;
  inputRateUsdPerMillion: number | null;
  outputRateUsdPerMillion: number | null;
  reasoningRateUsdPerMillion: number | null;
  cacheRateUsdPerMillion: number | null;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  estimatedCostUsd: number | null;
  estimatedInputUsd: number | null;
  estimatedOutputUsd: number | null;
  estimatedReasoningUsd: number | null;
  estimatedCacheUsd: number | null;
};

export type FilterOption = {
  value: string;
  label: string;
};

export type UsageBreakdowns = {
  devices: BreakdownRow[];
  tools: BreakdownRow[];
  models: BreakdownRow[];
  projects: BreakdownRow[];
};

export type UsageSessionRow = {
  id: string;
  sessionHash: string;
  source: string;
  projectKey: string;
  projectLabel: string;
  deviceId: string;
  deviceLabel: string;
  firstMessageAt: string;
  lastMessageAt: string;
  durationSeconds: number;
  activeSeconds: number;
  messageCount: number;
  userMessageCount: number;
};

export type UsageFilterOptions = {
  apiKeys: Array<{
    id: string;
    name: string;
    status: UsageApiKeyStatus;
  }>;
  devices: FilterOption[];
  sources: FilterOption[];
  models: FilterOption[];
  projects: FilterOption[];
};
