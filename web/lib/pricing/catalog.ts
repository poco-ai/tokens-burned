import { cache } from "react";

const PRICING_CATALOG_URL = "https://models.dev/api.json";
const PRICING_CATALOG_REVALIDATE_SECONDS = 60 * 60 * 12;

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

export function normalizeModelLookupKey(value: string) {
  return value.trim().toLowerCase();
}

export const getPricingCatalog = cache(
  async (): Promise<PricingCatalog | null> => {
    try {
      const response = await fetch(PRICING_CATALOG_URL, {
        next: {
          revalidate: PRICING_CATALOG_REVALIDATE_SECONDS,
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as RawCatalogPayload;
      const catalog: PricingCatalog = new Map();

      for (const [providerKey, providerValue] of Object.entries(payload)) {
        if (!providerValue || typeof providerValue !== "object") {
          continue;
        }

        const providerId = providerValue.id ?? providerKey;
        const providerName = providerValue.name ?? providerId;
        const modelsByLower = new Map<string, PricingCatalogModel>();
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

            modelsByLower.set(lookupKey, {
              id: modelId,
              name: modelValue.name ?? modelId,
              cost: modelValue.cost ?? null,
            });
          }
        }

        catalog.set(providerId, {
          id: providerId,
          name: providerName,
          modelsByLower,
        });
      }

      return catalog;
    } catch {
      return null;
    }
  },
);
