import { unstable_cache } from "next/cache";
import { cache } from "react";

const PRICING_CATALOG_URL = "https://models.dev/api.json";
const PRICING_CATALOG_REVALIDATE_SECONDS = 60 * 60 * 12;
const PRICING_CATALOG_CACHE_KEY = "pricing-catalog";

export type PricingCost = {
  input?: number;
  output?: number;
  reasoning?: number;
  cache_read?: number;
  cache_write?: number;
};

export type PricingCatalogModel = {
  id: string;
  name: string;
  cost: PricingCost | null;
};

export type PricingCatalogProvider = {
  id: string;
  name: string;
  modelsByLower: Map<string, PricingCatalogModel>;
};

export type PricingCatalog = Map<string, PricingCatalogProvider>;

type RawCatalogPayload = Record<
  string,
  {
    id?: string;
    name?: string;
    models?: Record<
      string,
      {
        id?: string;
        name?: string;
        cost?: PricingCost;
      }
    >;
  }
>;

export type SerializedPricingCatalogModel = readonly [
  lookupKey: string,
  modelId: string,
  modelName: string | null,
  cost: PricingCost | null,
];

export type SerializedPricingCatalogProvider = readonly [
  providerId: string,
  providerName: string | null,
  models: SerializedPricingCatalogModel[],
];

export type SerializedPricingCatalog = SerializedPricingCatalogProvider[];

export function normalizeModelLookupKey(value: string) {
  return value.trim().toLowerCase();
}

export function createPricingCatalogSnapshot(
  payload: RawCatalogPayload,
): SerializedPricingCatalog {
  const snapshot: SerializedPricingCatalog = [];

  for (const [providerKey, providerValue] of Object.entries(payload)) {
    if (!providerValue || typeof providerValue !== "object") {
      continue;
    }

    const providerId = providerValue.id ?? providerKey;
    if (!providerId) {
      continue;
    }

    const providerName = providerValue.name ?? providerId;
    const serializedModels: SerializedPricingCatalogModel[] = [];
    const rawModels = providerValue.models;

    if (rawModels && typeof rawModels === "object") {
      for (const [modelKey, modelValue] of Object.entries(rawModels)) {
        if (!modelValue || typeof modelValue !== "object") {
          continue;
        }

        const modelId = modelValue.id ?? modelKey;
        const lookupKey = normalizeModelLookupKey(modelId);
        if (!lookupKey) {
          continue;
        }

        const modelName = modelValue.name ?? modelId;

        serializedModels.push([
          lookupKey,
          modelId,
          modelName === modelId ? null : modelName,
          modelValue.cost ?? null,
        ]);
      }
    }

    snapshot.push([
      providerId,
      providerName === providerId ? null : providerName,
      serializedModels,
    ]);
  }

  return snapshot;
}

export function hydratePricingCatalogSnapshot(
  snapshot: SerializedPricingCatalog,
): PricingCatalog {
  const catalog: PricingCatalog = new Map();

  for (const [providerId, providerNameOverride, serializedModels] of snapshot) {
    if (!providerId) {
      continue;
    }

    const modelsByLower = new Map<string, PricingCatalogModel>();

    for (const [
      lookupKey,
      modelId,
      modelNameOverride,
      cost,
    ] of serializedModels) {
      if (!lookupKey || !modelId) {
        continue;
      }

      modelsByLower.set(lookupKey, {
        id: modelId,
        name: modelNameOverride ?? modelId,
        cost,
      });
    }

    catalog.set(providerId, {
      id: providerId,
      name: providerNameOverride ?? providerId,
      modelsByLower,
    });
  }

  return catalog;
}

const getCachedPricingCatalogSnapshot = unstable_cache(
  async (): Promise<SerializedPricingCatalog | null> => {
    try {
      // Skip Next.js fetch caching for the large upstream payload and cache a
      // compact serialized snapshot instead, which stays comfortably under the
      // per-entry data cache limit.
      const response = await fetch(PRICING_CATALOG_URL, {
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as RawCatalogPayload;
      return createPricingCatalogSnapshot(payload);
    } catch {
      return null;
    }
  },
  [PRICING_CATALOG_CACHE_KEY],
  {
    revalidate: PRICING_CATALOG_REVALIDATE_SECONDS,
  },
);

export const getPricingCatalog = cache(
  async (): Promise<PricingCatalog | null> => {
    const snapshot = await getCachedPricingCatalogSnapshot();
    if (!snapshot) {
      return null;
    }

    return hydratePricingCatalogSnapshot(snapshot);
  },
);
