import { prisma } from "@/lib/prisma";
import {
  getPreviousRange,
  groupByHourOrDay,
  listRangeBuckets,
} from "./date-range";
import type {
  ActivityTrendPoint,
  BreakdownRow,
  DashboardRange,
  FilterOption,
  TokenTrendPoint,
  UsageBreakdowns,
  UsageFilterOptions,
  UsageFilters,
  UsageMetricTotals,
  UsageOverviewMetrics,
} from "./types";

function applyBucketFilters<T extends Record<string, unknown>>(
  input: T,
  filters: UsageFilters,
) {
  return {
    ...input,
    ...(filters.apiKeyId ? { apiKeyId: filters.apiKeyId } : {}),
    ...(filters.deviceId ? { deviceId: filters.deviceId } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.model ? { model: filters.model } : {}),
    ...(filters.projectKey ? { projectKey: filters.projectKey } : {}),
  };
}

function applySessionFilters<T extends Record<string, unknown>>(
  input: T,
  filters: UsageFilters,
) {
  // Note: UsageSession doesn't have a `model` field, so we exclude it here
  return {
    ...input,
    ...(filters.apiKeyId ? { apiKeyId: filters.apiKeyId } : {}),
    ...(filters.deviceId ? { deviceId: filters.deviceId } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.projectKey ? { projectKey: filters.projectKey } : {}),
  };
}

async function loadBuckets(input: {
  userId: string;
  range: DashboardRange;
  filters: UsageFilters;
}) {
  return prisma.usageBucket.findMany({
    where: applyBucketFilters(
      {
        userId: input.userId,
        bucketStart: {
          gte: input.range.from,
          lte: input.range.to,
        },
      },
      input.filters,
    ),
    orderBy: { bucketStart: "asc" },
  });
}

async function loadSessions(input: {
  userId: string;
  range: DashboardRange;
  filters: UsageFilters;
}) {
  return prisma.usageSession.findMany({
    where: applySessionFilters(
      {
        userId: input.userId,
        firstMessageAt: {
          gte: input.range.from,
          lte: input.range.to,
        },
      },
      input.filters,
    ),
    orderBy: { firstMessageAt: "asc" },
  });
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
  const [currentBuckets, currentSessions, previousBuckets, previousSessions] =
    await Promise.all([
      loadBuckets(input),
      loadSessions(input),
      loadBuckets({ ...input, range: previousRange }),
      loadSessions({ ...input, range: previousRange }),
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
  const buckets = await loadBuckets(input);
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
  }

  return Array.from(seeded.values());
}

export async function getActivityTrend(input: {
  userId: string;
  range: DashboardRange;
  filters: UsageFilters;
}) {
  const sessions = await loadSessions(input);
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
    activeSeconds: 0,
    sessions: 0,
    messages: 0,
    userMessages: 0,
    share: 0,
  };

  rows.set(key, next);

  return next;
}

function buildDeviceDisplayLabels(
  devices: Array<{ deviceId: string; hostname: string }>,
) {
  const hostnameCounts = new Map<string, number>();

  for (const device of devices) {
    hostnameCounts.set(
      device.hostname,
      (hostnameCounts.get(device.hostname) ?? 0) + 1,
    );
  }

  return new Map(
    devices.map((device) => [
      device.deviceId,
      (hostnameCounts.get(device.hostname) ?? 0) > 1
        ? `${device.hostname} · ${device.deviceId.slice(0, 8)}`
        : device.hostname,
    ]),
  );
}

export async function getBreakdowns(input: {
  userId: string;
  range: DashboardRange;
  filters: UsageFilters;
}): Promise<UsageBreakdowns> {
  const [buckets, sessions, devices] = await Promise.all([
    loadBuckets(input),
    loadSessions(input),
    prisma.device.findMany({
      where: {
        userId: input.userId,
      },
    }),
  ]);

  const deviceLabels = buildDeviceDisplayLabels(devices);
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

    for (const row of [deviceRow, toolRow, modelRow, projectRow]) {
      row.totalTokens += bucket.totalTokens;
      row.inputTokens += bucket.inputTokens;
      row.outputTokens += bucket.outputTokens;
      row.reasoningTokens += bucket.reasoningTokens;
      row.cachedTokens += bucket.cachedTokens;
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

export async function getFilterOptions(
  userId: string,
): Promise<UsageFilterOptions> {
  const [apiKeys, devices, usageBuckets] = await Promise.all([
    prisma.usageApiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, status: true },
    }),
    prisma.device.findMany({
      where: { userId },
      orderBy: { lastSeenAt: "desc" },
      select: { deviceId: true, hostname: true },
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
  const deviceLabels = buildDeviceDisplayLabels(devices);

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
    devices: devices.map((device) => ({
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
