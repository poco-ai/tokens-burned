import { getPricingCatalog } from "@/lib/pricing/catalog";
import {
  estimateCostUsd,
  resolveOfficialPricingMatch,
  resolveOfficialPricingProvider,
} from "@/lib/pricing/resolve";
import { prisma } from "@/lib/prisma";
import { tokenCountToNumber } from "@/lib/token-counts";
import {
  getPreviousRange,
  groupByHourOrDay,
  listRangeBuckets,
} from "./date-range";
import {
  buildDeviceDedupeIndex,
  buildDeviceDisplayLabels,
  dedupeRowsByDeviceGroup,
  resolveDeviceFilterIds,
} from "./device-dedupe";
import type {
  ActivityTrendPoint,
  BreakdownRow,
  DashboardRange,
  FilterOption,
  ModelPricingRow,
  TokenTrendPoint,
  UsageBreakdowns,
  UsageFilterOptions,
  UsageFilters,
  UsageMetricTotals,
  UsageOverviewMetrics,
  UsagePricingSummary,
  UsageSessionRow,
} from "./types";

function applyBucketFilters<T extends Record<string, unknown>>(
  input: T,
  filters: UsageFilters,
  deviceIds?: string[],
) {
  return {
    ...input,
    ...(filters.apiKeyId ? { apiKeyId: filters.apiKeyId } : {}),
    ...(deviceIds ? { deviceId: { in: deviceIds } } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.model ? { model: filters.model } : {}),
    ...(filters.projectKey ? { projectKey: filters.projectKey } : {}),
  };
}

function applySessionFilters<T extends Record<string, unknown>>(
  input: T,
  filters: UsageFilters,
  deviceIds?: string[],
) {
  // Note: UsageSession doesn't have a `model` field, so we exclude it here
  return {
    ...input,
    ...(filters.apiKeyId ? { apiKeyId: filters.apiKeyId } : {}),
    ...(deviceIds ? { deviceId: { in: deviceIds } } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.projectKey ? { projectKey: filters.projectKey } : {}),
  };
}

async function loadDeviceIndex(userId: string) {
  const devices = await prisma.device.findMany({
    where: { userId },
    select: {
      deviceId: true,
      hostname: true,
      deviceFingerprint: true,
      firstSeenAt: true,
    },
  });

  return buildDeviceDedupeIndex(devices);
}

async function loadBuckets(input: {
  userId: string;
  range: DashboardRange;
  filters: UsageFilters;
  deviceIndex: Awaited<ReturnType<typeof loadDeviceIndex>>;
}) {
  const filterDeviceIds = resolveDeviceFilterIds(
    input.deviceIndex,
    input.filters.deviceId,
  );
  const rows = await prisma.usageBucket.findMany({
    where: applyBucketFilters(
      {
        userId: input.userId,
        bucketStart: {
          gte: input.range.from,
          lte: input.range.to,
        },
      },
      input.filters,
      filterDeviceIds,
    ),
    orderBy: { bucketStart: "asc" },
    select: {
      id: true,
      userId: true,
      apiKeyId: true,
      deviceId: true,
      source: true,
      model: true,
      projectKey: true,
      projectLabel: true,
      bucketStart: true,
      inputTokens: true,
      outputTokens: true,
      reasoningTokens: true,
      cachedTokens: true,
      totalTokens: true,
      estimatedCostUsd: true,
      estimatedInputUsd: true,
      estimatedOutputUsd: true,
      estimatedReasoningUsd: true,
      estimatedCacheUsd: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const dedupedRows = dedupeRowsByDeviceGroup(
    rows,
    input.deviceIndex,
    (bucket, deviceGroupKey) =>
      [
        deviceGroupKey,
        bucket.source,
        bucket.model,
        bucket.projectKey,
        bucket.bucketStart.toISOString(),
      ].join("|"),
  ).sort(
    (left, right) => left.bucketStart.getTime() - right.bucketStart.getTime(),
  );

  return dedupedRows.map((bucket) => ({
    ...bucket,
    totalTokens: tokenCountToNumber(bucket.totalTokens),
    inputTokens: tokenCountToNumber(bucket.inputTokens),
    outputTokens: tokenCountToNumber(bucket.outputTokens),
    reasoningTokens: tokenCountToNumber(bucket.reasoningTokens),
    cachedTokens: tokenCountToNumber(bucket.cachedTokens),
  }));
}

async function loadSessions(input: {
  userId: string;
  range: DashboardRange;
  filters: UsageFilters;
  deviceIndex: Awaited<ReturnType<typeof loadDeviceIndex>>;
}) {
  const filterDeviceIds = resolveDeviceFilterIds(
    input.deviceIndex,
    input.filters.deviceId,
  );
  const rows = await prisma.usageSession.findMany({
    where: applySessionFilters(
      {
        userId: input.userId,
        firstMessageAt: {
          gte: input.range.from,
          lte: input.range.to,
        },
      },
      input.filters,
      filterDeviceIds,
    ),
    orderBy: { firstMessageAt: "asc" },
    select: {
      id: true,
      userId: true,
      apiKeyId: true,
      deviceId: true,
      source: true,
      projectKey: true,
      projectLabel: true,
      sessionHash: true,
      firstMessageAt: true,
      lastMessageAt: true,
      durationSeconds: true,
      activeSeconds: true,
      inputTokens: true,
      outputTokens: true,
      reasoningTokens: true,
      cachedTokens: true,
      totalTokens: true,
      primaryModel: true,
      estimatedCostUsd: true,
      messageCount: true,
      userMessageCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return dedupeRowsByDeviceGroup(
    rows,
    input.deviceIndex,
    (session, deviceGroupKey) =>
      [deviceGroupKey, session.source, session.sessionHash].join("|"),
  ).sort(
    (left, right) =>
      left.firstMessageAt.getTime() - right.firstMessageAt.getTime(),
  );
}

type UsageBucketRecord = Awaited<ReturnType<typeof loadBuckets>>[number];

function estimateBucketCostUsd(
  bucket: Pick<
    UsageBucketRecord,
    | "model"
    | "inputTokens"
    | "outputTokens"
    | "reasoningTokens"
    | "cachedTokens"
  >,
  catalog: Awaited<ReturnType<typeof getPricingCatalog>>,
) {
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
}

function emptyTotals(): UsageMetricTotals {
  return {
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    cachedTokens: 0,
    activeSeconds: 0,
    totalSeconds: 0,
    sessions: 0,
    messages: 0,
    userMessages: 0,
  };
}

function summarizeTotals(input: {
  buckets: Awaited<ReturnType<typeof loadBuckets>>;
  sessions: Awaited<ReturnType<typeof loadSessions>>;
}): UsageMetricTotals {
  const totals = emptyTotals();

  for (const bucket of input.buckets) {
    totals.totalTokens += bucket.totalTokens;
    totals.inputTokens += bucket.inputTokens;
    totals.outputTokens += bucket.outputTokens;
    totals.reasoningTokens += bucket.reasoningTokens;
    totals.cachedTokens += bucket.cachedTokens;
  }

  totals.sessions = input.sessions.length;

  for (const session of input.sessions) {
    totals.activeSeconds += session.activeSeconds;
    totals.totalSeconds += session.durationSeconds;
    totals.messages += session.messageCount;
    totals.userMessages += session.userMessageCount;
  }

  return totals;
}

function toOverview(
  current: UsageMetricTotals,
  previous: UsageMetricTotals,
): UsageOverviewMetrics {
  return {
    totalTokens: {
      current: current.totalTokens,
      previous: previous.totalTokens,
      delta: current.totalTokens - previous.totalTokens,
    },
    inputTokens: {
      current: current.inputTokens,
      previous: previous.inputTokens,
      delta: current.inputTokens - previous.inputTokens,
    },
    outputTokens: {
      current: current.outputTokens,
      previous: previous.outputTokens,
      delta: current.outputTokens - previous.outputTokens,
    },
    reasoningTokens: {
      current: current.reasoningTokens,
      previous: previous.reasoningTokens,
      delta: current.reasoningTokens - previous.reasoningTokens,
    },
    cachedTokens: {
      current: current.cachedTokens,
      previous: previous.cachedTokens,
      delta: current.cachedTokens - previous.cachedTokens,
    },
    activeSeconds: {
      current: current.activeSeconds,
      previous: previous.activeSeconds,
      delta: current.activeSeconds - previous.activeSeconds,
    },
    totalSeconds: {
      current: current.totalSeconds,
      previous: previous.totalSeconds,
      delta: current.totalSeconds - previous.totalSeconds,
    },
    sessions: {
      current: current.sessions,
      previous: previous.sessions,
      delta: current.sessions - previous.sessions,
    },
    messages: {
      current: current.messages,
      previous: previous.messages,
      delta: current.messages - previous.messages,
    },
    userMessages: {
      current: current.userMessages,
      previous: previous.userMessages,
      delta: current.userMessages - previous.userMessages,
    },
  };
}

export async function getOverviewMetrics(input: {
  userId: string;
  range: DashboardRange;
  filters: UsageFilters;
}) {
  const previousRange = getPreviousRange(input.range);
  const deviceIndex = await loadDeviceIndex(input.userId);
  const [currentBuckets, currentSessions, previousBuckets, previousSessions] =
    await Promise.all([
      loadBuckets({ ...input, deviceIndex }),
      loadSessions({ ...input, deviceIndex }),
      loadBuckets({ ...input, range: previousRange, deviceIndex }),
      loadSessions({ ...input, range: previousRange, deviceIndex }),
    ]);

  return toOverview(
    summarizeTotals({ buckets: currentBuckets, sessions: currentSessions }),
    summarizeTotals({ buckets: previousBuckets, sessions: previousSessions }),
  );
}

export async function getTokenTrend(input: {
  userId: string;
  range: DashboardRange;
  filters: UsageFilters;
}) {
  const deviceIndex = await loadDeviceIndex(input.userId);
  const [catalog, buckets, sessions] = await Promise.all([
    getPricingCatalog(),
    loadBuckets({ ...input, deviceIndex }),
    loadSessions({ ...input, deviceIndex }),
  ]);
  const seeded = new Map<string, TokenTrendPoint>(
    listRangeBuckets(input.range).map((bucket) => [
      bucket.key,
      {
        label: bucket.key,
        start: bucket.start.toISOString(),
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        cachedTokens: 0,
        estimatedCostUsd: 0,
        totalSeconds: 0,
      },
    ]),
  );

  for (const bucket of buckets) {
    const key = groupByHourOrDay(input.range, bucket.bucketStart);
    const point = seeded.get(key);

    if (!point) {
      continue;
    }

    point.totalTokens += bucket.totalTokens;
    point.inputTokens += bucket.inputTokens;
    point.outputTokens += bucket.outputTokens;
    point.reasoningTokens += bucket.reasoningTokens;
    point.cachedTokens += bucket.cachedTokens;
    point.estimatedCostUsd += estimateBucketCostUsd(bucket, catalog);
  }

  for (const session of sessions) {
    const key = groupByHourOrDay(input.range, session.firstMessageAt);
    const point = seeded.get(key);

    if (!point) {
      continue;
    }

    point.totalSeconds += session.durationSeconds;
  }

  return Array.from(seeded.values());
}

export async function getActivityTrend(input: {
  userId: string;
  range: DashboardRange;
  filters: UsageFilters;
}) {
  const deviceIndex = await loadDeviceIndex(input.userId);
  const sessions = await loadSessions({ ...input, deviceIndex });
  const seeded = new Map<string, ActivityTrendPoint>(
    listRangeBuckets(input.range).map((bucket) => [
      bucket.key,
      {
        label: bucket.key,
        start: bucket.start.toISOString(),
        activeSeconds: 0,
        totalSeconds: 0,
        sessions: 0,
        messages: 0,
        userMessages: 0,
      },
    ]),
  );

  for (const session of sessions) {
    const key = groupByHourOrDay(input.range, session.firstMessageAt);
    const point = seeded.get(key);

    if (!point) {
      continue;
    }

    point.activeSeconds += session.activeSeconds;
    point.totalSeconds += session.durationSeconds;
    point.sessions += 1;
    point.messages += session.messageCount;
    point.userMessages += session.userMessageCount;
  }

  return Array.from(seeded.values());
}

function finalizeBreakdownRows(rows: Map<string, BreakdownRow>) {
  const values = Array.from(rows.values()).sort(
    (left, right) => right.totalTokens - left.totalTokens,
  );
  const totalTokens = values.reduce((sum, row) => sum + row.totalTokens, 0);

  for (const row of values) {
    row.share = totalTokens === 0 ? 0 : row.totalTokens / totalTokens;
  }

  return values;
}

function ensureBreakdownRow(
  rows: Map<string, BreakdownRow>,
  key: string,
  name: string,
): BreakdownRow {
  const existing = rows.get(key);

  if (existing) {
    return existing;
  }

  const next: BreakdownRow = {
    key,
    name,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    cachedTokens: 0,
    estimatedCostUsd: 0,
    activeSeconds: 0,
    totalSeconds: 0,
    sessions: 0,
    messages: 0,
    userMessages: 0,
    share: 0,
  };

  rows.set(key, next);

  return next;
}

export async function getBreakdowns(input: {
  userId: string;
  range: DashboardRange;
  filters: UsageFilters;
}): Promise<UsageBreakdowns> {
  const deviceIndex = await loadDeviceIndex(input.userId);
  const [catalog, buckets, sessions] = await Promise.all([
    getPricingCatalog(),
    loadBuckets({ ...input, deviceIndex }),
    loadSessions({ ...input, deviceIndex }),
  ]);

  const deviceLabels = buildDeviceDisplayLabels(deviceIndex.canonicalDevices);
  const byDevice = new Map<string, BreakdownRow>();
  const byTool = new Map<string, BreakdownRow>();
  const byModel = new Map<string, BreakdownRow>();
  const byProject = new Map<string, BreakdownRow>();

  for (const bucket of buckets) {
    const deviceRow = ensureBreakdownRow(
      byDevice,
      bucket.deviceId,
      deviceLabels.get(bucket.deviceId) ?? bucket.deviceId,
    );
    const toolRow = ensureBreakdownRow(byTool, bucket.source, bucket.source);
    const modelRow = ensureBreakdownRow(byModel, bucket.model, bucket.model);
    const projectRow = ensureBreakdownRow(
      byProject,
      bucket.projectKey,
      bucket.projectLabel,
    );
    const estimatedCostUsd = estimateBucketCostUsd(bucket, catalog);

    for (const row of [deviceRow, toolRow, modelRow, projectRow]) {
      row.totalTokens += bucket.totalTokens;
      row.inputTokens += bucket.inputTokens;
      row.outputTokens += bucket.outputTokens;
      row.reasoningTokens += bucket.reasoningTokens;
      row.cachedTokens += bucket.cachedTokens;
      row.estimatedCostUsd += estimatedCostUsd;
    }
  }

  for (const session of sessions) {
    const deviceRow = ensureBreakdownRow(
      byDevice,
      session.deviceId,
      deviceLabels.get(session.deviceId) ?? session.deviceId,
    );
    const toolRow = ensureBreakdownRow(byTool, session.source, session.source);
    const projectRow = ensureBreakdownRow(
      byProject,
      session.projectKey,
      session.projectLabel,
    );

    for (const row of [deviceRow, toolRow, projectRow]) {
      row.activeSeconds += session.activeSeconds;
      row.totalSeconds += session.durationSeconds;
      row.sessions += 1;
      row.messages += session.messageCount;
      row.userMessages += session.userMessageCount;
    }
  }

  return {
    devices: finalizeBreakdownRows(byDevice),
    tools: finalizeBreakdownRows(byTool),
    models: finalizeBreakdownRows(byModel),
    projects: finalizeBreakdownRows(byProject),
  };
}

function buildModelPricingRows(
  buckets: UsageBucketRecord[],
  catalog: Awaited<ReturnType<typeof getPricingCatalog>>,
): ModelPricingRow[] {
  const byModel = new Map<string, ModelPricingRow>();

  for (const bucket of buckets) {
    const existing = byModel.get(bucket.model);

    if (existing) {
      existing.totalTokens += bucket.totalTokens;
      existing.inputTokens += bucket.inputTokens;
      existing.outputTokens += bucket.outputTokens;
      existing.reasoningTokens += bucket.reasoningTokens;
      existing.cachedTokens += bucket.cachedTokens;
      continue;
    }

    byModel.set(bucket.model, {
      rawModel: bucket.model,
      pricingProviderId: null,
      pricingProviderName: null,
      matchedModelId: null,
      matchedModelName: null,
      inputRateUsdPerMillion: null,
      outputRateUsdPerMillion: null,
      reasoningRateUsdPerMillion: null,
      cacheRateUsdPerMillion: null,
      totalTokens: bucket.totalTokens,
      inputTokens: bucket.inputTokens,
      outputTokens: bucket.outputTokens,
      reasoningTokens: bucket.reasoningTokens,
      cachedTokens: bucket.cachedTokens,
      estimatedCostUsd: null,
      estimatedInputUsd: null,
      estimatedOutputUsd: null,
      estimatedReasoningUsd: null,
      estimatedCacheUsd: null,
    });
  }

  const rows = Array.from(byModel.values());

  for (const row of rows) {
    const provider = resolveOfficialPricingProvider(catalog, row.rawModel);
    row.pricingProviderId = provider?.providerId ?? null;
    row.pricingProviderName = provider?.providerName ?? null;

    const match = resolveOfficialPricingMatch(catalog, row.rawModel);

    if (!match) {
      continue;
    }

    const estimate = estimateCostUsd(
      {
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        reasoningTokens: row.reasoningTokens,
        cachedTokens: row.cachedTokens,
      },
      match.cost,
    );

    row.pricingProviderId = match.providerId;
    row.pricingProviderName = match.providerName;
    row.matchedModelId = match.modelId;
    row.matchedModelName = match.modelName;
    row.inputRateUsdPerMillion = match.cost?.input ?? null;
    row.outputRateUsdPerMillion = match.cost?.output ?? null;
    row.reasoningRateUsdPerMillion = match.cost?.reasoning ?? null;
    row.cacheRateUsdPerMillion = match.cost?.cache_read ?? null;
    row.estimatedCostUsd = estimate?.totalUsd ?? null;
    row.estimatedInputUsd = estimate?.inputUsd ?? null;
    row.estimatedOutputUsd = estimate?.outputUsd ?? null;
    row.estimatedReasoningUsd = estimate?.reasoningUsd ?? null;
    row.estimatedCacheUsd = estimate?.cacheUsd ?? null;
  }

  return rows.sort((left, right) => {
    const rightCost = right.estimatedCostUsd ?? -1;
    const leftCost = left.estimatedCostUsd ?? -1;

    if (rightCost !== leftCost) {
      return rightCost - leftCost;
    }

    if (right.totalTokens !== left.totalTokens) {
      return right.totalTokens - left.totalTokens;
    }

    return left.rawModel.localeCompare(right.rawModel);
  });
}

function summarizePricingRows(
  currentRows: ModelPricingRow[],
  previousRows: ModelPricingRow[],
): UsagePricingSummary {
  const currentUsd = currentRows.reduce(
    (sum, row) => sum + (row.estimatedCostUsd ?? 0),
    0,
  );
  const previousUsd = previousRows.reduce(
    (sum, row) => sum + (row.estimatedCostUsd ?? 0),
    0,
  );
  const pricedTokens = currentRows.reduce(
    (sum, row) => sum + (row.estimatedCostUsd == null ? 0 : row.totalTokens),
    0,
  );
  const totalTokens = currentRows.reduce(
    (sum, row) => sum + row.totalTokens,
    0,
  );
  const pricedModels = currentRows.filter(
    (row) => row.estimatedCostUsd != null,
  ).length;

  return {
    currentUsd,
    previousUsd,
    deltaUsd: currentUsd - previousUsd,
    pricedTokens,
    totalTokens,
    coverage: totalTokens === 0 ? 0 : pricedTokens / totalTokens,
    pricedModels,
    totalModels: currentRows.length,
  };
}

export async function getPricingSummaryAndRows(input: {
  userId: string;
  range: DashboardRange;
  filters: UsageFilters;
}): Promise<{
  summary: UsagePricingSummary;
  modelPricingRows: ModelPricingRow[];
}> {
  const previousRange = getPreviousRange(input.range);
  const deviceIndex = await loadDeviceIndex(input.userId);
  const [catalog, currentBuckets, previousBuckets] = await Promise.all([
    getPricingCatalog(),
    loadBuckets({ ...input, deviceIndex }),
    loadBuckets({ ...input, range: previousRange, deviceIndex }),
  ]);

  const modelPricingRows = buildModelPricingRows(currentBuckets, catalog);
  const previousRows = buildModelPricingRows(previousBuckets, catalog);

  return {
    summary: summarizePricingRows(modelPricingRows, previousRows),
    modelPricingRows,
  };
}

export async function getSessionRows(input: {
  userId: string;
  range: DashboardRange;
  filters: UsageFilters;
}): Promise<UsageSessionRow[]> {
  const deviceIndex = await loadDeviceIndex(input.userId);
  const sessions = (await loadSessions({ ...input, deviceIndex })).sort(
    (left, right) => {
      const byFirstMessage =
        right.firstMessageAt.getTime() - left.firstMessageAt.getTime();

      if (byFirstMessage !== 0) {
        return byFirstMessage;
      }

      return right.lastMessageAt.getTime() - left.lastMessageAt.getTime();
    },
  );
  const deviceLabels = buildDeviceDisplayLabels(deviceIndex.canonicalDevices);

  return sessions.map((session) => ({
    id: session.id,
    sessionHash: session.sessionHash,
    source: session.source,
    projectKey: session.projectKey,
    projectLabel: session.projectLabel,
    deviceId: session.deviceId,
    deviceLabel: deviceLabels.get(session.deviceId) ?? session.deviceId,
    firstMessageAt: session.firstMessageAt.toISOString(),
    lastMessageAt: session.lastMessageAt.toISOString(),
    durationSeconds: session.durationSeconds,
    activeSeconds: session.activeSeconds,
    messageCount: session.messageCount,
    userMessageCount: session.userMessageCount,
    estimatedCostUsd: session.estimatedCostUsd,
    totalTokens: tokenCountToNumber(session.totalTokens),
    inputTokens: tokenCountToNumber(session.inputTokens),
    outputTokens: tokenCountToNumber(session.outputTokens),
    reasoningTokens: tokenCountToNumber(session.reasoningTokens),
    cachedTokens: tokenCountToNumber(session.cachedTokens),
    primaryModel: session.primaryModel,
  }));
}

export async function getFilterOptions(
  userId: string,
): Promise<UsageFilterOptions> {
  const deviceIndex = await loadDeviceIndex(userId);
  const [apiKeys, usageBuckets] = await Promise.all([
    prisma.usageApiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, status: true },
    }),
    prisma.usageBucket.findMany({
      where: { userId },
      select: {
        source: true,
        model: true,
        projectKey: true,
        projectLabel: true,
      },
    }),
  ]);
  const deviceLabels = buildDeviceDisplayLabels(deviceIndex.canonicalDevices);

  const sources = new Map<string, FilterOption>();
  const models = new Map<string, FilterOption>();
  const projects = new Map<string, FilterOption>();

  for (const bucket of usageBuckets) {
    sources.set(bucket.source, { value: bucket.source, label: bucket.source });
    models.set(bucket.model, { value: bucket.model, label: bucket.model });
    projects.set(bucket.projectKey, {
      value: bucket.projectKey,
      label: bucket.projectLabel,
    });
  }

  return {
    apiKeys,
    devices: deviceIndex.canonicalDevices.map((device) => ({
      value: device.deviceId,
      label: deviceLabels.get(device.deviceId) ?? device.hostname,
    })),
    sources: Array.from(sources.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    ),
    models: Array.from(models.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    ),
    projects: Array.from(projects.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    ),
  };
}

export async function getLastSyncedAt(userId: string) {
  const [bucket, session, device] = await Promise.all([
    prisma.usageBucket.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.usageSession.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.device.findFirst({
      where: { userId },
      orderBy: { lastSeenAt: "desc" },
      select: { lastSeenAt: true },
    }),
  ]);

  return (
    [bucket?.updatedAt, session?.updatedAt, device?.lastSeenAt]
      .filter((value): value is Date => Boolean(value))
      .sort((left, right) => right.getTime() - left.getTime())[0] ?? null
  );
}
