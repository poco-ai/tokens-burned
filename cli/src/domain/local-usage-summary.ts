import type { SessionMetadata, TokenBucket } from "./types";

export interface LocalUsageToolDefinition {
  id: string;
  name: string;
}

export interface LocalUsageTotals {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  buckets: number;
  sessions: number;
  projects: number;
  models: number;
}

export interface LocalUsageRankItem {
  name: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  sessions: number;
}

export interface LocalUsageSessionItem {
  project: string;
  primaryModel: string;
  lastMessageAt: string;
  totalTokens: number;
  messageCount: number;
  activeSeconds: number;
}

export interface LocalUsageToolSummary {
  source: string;
  name: string;
  totals: LocalUsageTotals;
  topModels: LocalUsageRankItem[];
  topProjects: LocalUsageRankItem[];
  sessions: LocalUsageSessionItem[];
}

export interface LocalUsageDashboardData {
  generatedAt: string;
  totals: LocalUsageTotals;
  tools: LocalUsageToolSummary[];
}

export interface BuildLocalUsageDashboardInput {
  buckets: TokenBucket[];
  sessions: SessionMetadata[];
  tools: LocalUsageToolDefinition[];
}

function createTotals(): LocalUsageTotals {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    buckets: 0,
    sessions: 0,
    projects: 0,
    models: 0,
  };
}

function addBucketToTotals(
  totals: LocalUsageTotals,
  bucket: TokenBucket,
): void {
  totals.inputTokens += bucket.inputTokens || 0;
  totals.outputTokens += bucket.outputTokens || 0;
  totals.cachedTokens += bucket.cachedTokens || 0;
  totals.reasoningTokens += bucket.reasoningTokens || 0;
  totals.totalTokens += bucket.totalTokens || 0;
  totals.buckets += 1;
}

function addBucketToRank(
  map: Map<string, LocalUsageRankItem>,
  key: string,
  bucket: TokenBucket,
): void {
  const name = key || "unknown";
  const current = map.get(name) ?? {
    name,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    sessions: 0,
  };

  current.inputTokens += bucket.inputTokens || 0;
  current.outputTokens += bucket.outputTokens || 0;
  current.cachedTokens += bucket.cachedTokens || 0;
  current.reasoningTokens += bucket.reasoningTokens || 0;
  current.totalTokens += bucket.totalTokens || 0;
  map.set(name, current);
}

function sortRankItems(
  items: Iterable<LocalUsageRankItem>,
): LocalUsageRankItem[] {
  return Array.from(items).sort((left, right) => {
    if (right.totalTokens !== left.totalTokens) {
      return right.totalTokens - left.totalTokens;
    }
    return left.name.localeCompare(right.name);
  });
}

function buildToolSummary(input: {
  source: string;
  name: string;
  buckets: TokenBucket[];
  sessions: SessionMetadata[];
}): LocalUsageToolSummary {
  const totals = createTotals();
  const modelTotals = new Map<string, LocalUsageRankItem>();
  const projectTotals = new Map<string, LocalUsageRankItem>();
  const projects = new Set<string>();
  const models = new Set<string>();

  for (const bucket of input.buckets) {
    addBucketToTotals(totals, bucket);
    addBucketToRank(modelTotals, bucket.model, bucket);
    addBucketToRank(projectTotals, bucket.project, bucket);
    projects.add(bucket.project || "unknown");
    models.add(bucket.model || "unknown");
  }

  for (const session of input.sessions) {
    const projectName = session.project || "unknown";
    const modelName = session.primaryModel || "unknown";
    projects.add(projectName);
    models.add(modelName);

    const project = projectTotals.get(projectName);
    if (project) {
      project.sessions += 1;
    } else {
      projectTotals.set(projectName, {
        name: projectName,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        sessions: 1,
      });
    }

    const model = modelTotals.get(modelName);
    if (model) {
      model.sessions += 1;
    } else {
      modelTotals.set(modelName, {
        name: modelName,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        sessions: 1,
      });
    }
  }

  totals.sessions = input.sessions.length;
  totals.projects = projects.size;
  totals.models = models.size;

  return {
    source: input.source,
    name: input.name,
    totals,
    topModels: sortRankItems(modelTotals.values()).slice(0, 8),
    topProjects: sortRankItems(projectTotals.values()).slice(0, 8),
    sessions: input.sessions
      .slice()
      .sort(
        (left, right) =>
          new Date(right.lastMessageAt).getTime() -
          new Date(left.lastMessageAt).getTime(),
      )
      .slice(0, 8)
      .map((session) => ({
        project: session.project || "unknown",
        primaryModel: session.primaryModel || "unknown",
        lastMessageAt: session.lastMessageAt,
        totalTokens: session.totalTokens || 0,
        messageCount: session.messageCount || 0,
        activeSeconds: session.activeSeconds || 0,
      })),
  };
}

export function buildLocalUsageDashboardData(
  input: BuildLocalUsageDashboardInput,
): LocalUsageDashboardData {
  const toolNames = new Map(input.tools.map((tool) => [tool.id, tool.name]));
  const parsedSources = new Set<string>();
  for (const bucket of input.buckets) parsedSources.add(bucket.source);
  for (const session of input.sessions) parsedSources.add(session.source);

  const sources = Array.from(parsedSources);

  const tools = sources
    .sort((left, right) => {
      const leftToolIndex = input.tools.findIndex((tool) => tool.id === left);
      const rightToolIndex = input.tools.findIndex((tool) => tool.id === right);
      if (leftToolIndex !== -1 || rightToolIndex !== -1) {
        if (leftToolIndex === -1) return 1;
        if (rightToolIndex === -1) return -1;
        return leftToolIndex - rightToolIndex;
      }
      return left.localeCompare(right);
    })
    .map((source) =>
      buildToolSummary({
        source,
        name: toolNames.get(source) ?? source,
        buckets: input.buckets.filter((bucket) => bucket.source === source),
        sessions: input.sessions.filter((session) => session.source === source),
      }),
    );

  const totals = createTotals();
  const projects = new Set<string>();
  const models = new Set<string>();

  for (const bucket of input.buckets) {
    addBucketToTotals(totals, bucket);
    projects.add(bucket.project || "unknown");
    models.add(bucket.model || "unknown");
  }
  for (const session of input.sessions) {
    projects.add(session.project || "unknown");
    models.add(session.primaryModel || "unknown");
  }

  totals.sessions = input.sessions.length;
  totals.projects = projects.size;
  totals.models = models.size;

  return {
    generatedAt: new Date().toISOString(),
    totals,
    tools,
  };
}
