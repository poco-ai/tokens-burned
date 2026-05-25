import {
  normalizeModelLookupKey,
  type PricingCatalog,
  type PricingCatalogModel,
  type PricingCost,
} from "./catalog";

const MODEL_PATH_SEPARATOR = "/";
const MODEL_VARIANT_SEPARATOR = ":";

type PricingProviderRule = {
  providerId: string;
  matches: (candidate: string) => boolean;
};

const OFFICIAL_PRICING_PROVIDER_RULES: PricingProviderRule[] = [
  {
    providerId: "anthropic",
    matches: (candidate) => candidate.startsWith("claude-"),
  },
  {
    providerId: "openai",
    matches: (candidate) =>
      candidate.startsWith("gpt-") ||
      candidate.startsWith("gpt-oss-") ||
      candidate.startsWith("o1") ||
      candidate.startsWith("o3") ||
      candidate.startsWith("o4") ||
      candidate.startsWith("text-embedding-") ||
      candidate.startsWith("text-moderation-") ||
      candidate.startsWith("omni-moderation-"),
  },
  {
    providerId: "google",
    matches: (candidate) => candidate.startsWith("gemini-"),
  },
  {
    providerId: "deepseek",
    matches: (candidate) => candidate.startsWith("deepseek-"),
  },
  {
    providerId: "moonshotai",
    matches: (candidate) => candidate.startsWith("kimi-"),
  },
  {
    providerId: "zai",
    matches: (candidate) => candidate.startsWith("glm-"),
  },
  {
    providerId: "alibaba",
    matches: (candidate) =>
      candidate.startsWith("qwen") ||
      candidate.startsWith("qwq-") ||
      candidate.startsWith("qvq-"),
  },
  {
    providerId: "minimax",
    matches: (candidate) => candidate.startsWith("minimax-"),
  },
  {
    providerId: "xai",
    matches: (candidate) => candidate.startsWith("grok-"),
  },
  {
    providerId: "mistral",
    matches: (candidate) =>
      candidate.startsWith("mistral-") ||
      candidate.startsWith("ministral-") ||
      candidate.startsWith("magistral-") ||
      candidate.startsWith("codestral-") ||
      candidate.startsWith("pixtral-") ||
      candidate.startsWith("devstral-"),
  },
  {
    providerId: "cohere",
    matches: (candidate) =>
      candidate.startsWith("command-") || candidate.startsWith("embed-"),
  },
];

export type PricingModelMatch = {
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  cost: PricingCost | null;
};

export type PricingProviderMatch = {
  providerId: string;
  providerName: string;
};

export type CostEstimate = {
  totalUsd: number;
  inputUsd: number;
  outputUsd: number;
  reasoningUsd: number;
  cacheUsd: number;
};

function _unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function buildModelLookupCandidates(rawModel: string) {
  const normalized = normalizeModelLookupKey(rawModel);
  if (!normalized) {
    return [];
  }

  const candidates = [normalized];
  const lastSegment = normalized.includes(MODEL_PATH_SEPARATOR)
    ? (normalized.split(MODEL_PATH_SEPARATOR).at(-1) ?? "")
    : "";

  if (lastSegment) {
    candidates.push(lastSegment);
  }

  const seen = new Set<string>(candidates.filter(Boolean));

  const values = [normalized, lastSegment].filter((v) =>
    v?.includes(MODEL_VARIANT_SEPARATOR),
  );

  for (const value of values) {
    const variant = value.split(MODEL_VARIANT_SEPARATOR)[0] ?? "";
    if (variant) {
      seen.add(variant);
    }
  }

  return Array.from(seen);
}

export function resolveOfficialPricingProviderId(rawModel: string) {
  const candidates = buildModelLookupCandidates(rawModel);

  for (const rule of OFFICIAL_PRICING_PROVIDER_RULES) {
    for (const candidate of candidates) {
      if (rule.matches(candidate)) {
        return rule.providerId;
      }
    }
  }

  return null;
}

export function resolveOfficialPricingProvider(
  catalog: PricingCatalog | null,
  rawModel: string,
): PricingProviderMatch | null {
  if (!catalog) {
    return null;
  }

  const providerId = resolveOfficialPricingProviderId(rawModel);
  if (!providerId) {
    return null;
  }

  const provider = catalog.get(providerId);
  if (!provider) {
    return null;
  }

  return {
    providerId,
    providerName: provider.name,
  };
}

function findCatalogModel(
  catalog: PricingCatalog,
  providerId: string,
  candidates: string[],
): { providerName: string; model: PricingCatalogModel } | null {
  const provider = catalog.get(providerId);
  if (!provider) {
    return null;
  }

  for (const candidate of candidates) {
    const model = provider.modelsByLower.get(candidate);
    if (model) {
      return {
        providerName: provider.name,
        model,
      };
    }
  }

  return null;
}

export function resolveOfficialPricingMatch(
  catalog: PricingCatalog | null,
  rawModel: string,
): PricingModelMatch | null {
  if (!catalog) {
    return null;
  }

  const providerId = resolveOfficialPricingProviderId(rawModel);
  if (!providerId) {
    return null;
  }

  const match = findCatalogModel(
    catalog,
    providerId,
    buildModelLookupCandidates(rawModel),
  );
  if (!match) {
    return null;
  }

  return {
    providerId,
    providerName: match.providerName,
    modelId: match.model.id,
    modelName: match.model.name,
    cost: match.model.cost,
  };
}

export function estimateCostUsd(
  input: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cachedTokens: number;
  },
  cost: PricingCost | null | undefined,
): CostEstimate | null {
  if (!cost) {
    return null;
  }

  const inputUsd = (input.inputTokens / 1_000_000) * (cost.input ?? 0);
  const outputUsd = (input.outputTokens / 1_000_000) * (cost.output ?? 0);
  const reasoningUsd =
    (input.reasoningTokens / 1_000_000) * (cost.reasoning ?? cost.output ?? 0);
  const cacheUsd = (input.cachedTokens / 1_000_000) * (cost.cache_read ?? 0);

  return {
    totalUsd: inputUsd + outputUsd + reasoningUsd + cacheUsd,
    inputUsd,
    outputUsd,
    reasoningUsd,
    cacheUsd,
  };
}
