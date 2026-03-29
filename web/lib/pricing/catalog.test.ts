import { describe, expect, it } from "vitest";

import {
  createPricingCatalogSnapshot,
  hydratePricingCatalogSnapshot,
} from "./catalog";

describe("pricing catalog snapshot", () => {
  it("compacts the upstream payload and hydrates the lookup maps back", () => {
    const rawPayload = {
      openai: {
        id: "openai",
        name: "OpenAI",
        models: {
          "gpt-4.1": {
            name: "GPT-4.1",
            cost: {
              input: 2,
              output: 8,
            },
          },
          "gpt-4.1-mini": {
            id: "gpt-4.1-mini",
          },
        },
      },
      minimax: {
        id: "minimax",
        models: {
          "minimax-m2.5": {
            id: "MiniMax-M2.5",
            name: "MiniMax M2.5",
            cost: {
              input: 0.3,
            },
          },
        },
      },
    };

    const snapshot = createPricingCatalogSnapshot(rawPayload);

    expect(snapshot).toEqual([
      [
        "openai",
        "OpenAI",
        [
          [
            "gpt-4.1",
            "gpt-4.1",
            "GPT-4.1",
            {
              input: 2,
              output: 8,
            },
          ],
          ["gpt-4.1-mini", "gpt-4.1-mini", null, null],
        ],
      ],
      [
        "minimax",
        null,
        [
          [
            "minimax-m2.5",
            "MiniMax-M2.5",
            "MiniMax M2.5",
            {
              input: 0.3,
            },
          ],
        ],
      ],
    ]);

    expect(JSON.stringify(snapshot).length).toBeLessThan(
      JSON.stringify(rawPayload).length,
    );

    const catalog = hydratePricingCatalogSnapshot(snapshot);

    expect(catalog.get("openai")).toEqual({
      id: "openai",
      name: "OpenAI",
      modelsByLower: new Map([
        [
          "gpt-4.1",
          {
            id: "gpt-4.1",
            name: "GPT-4.1",
            cost: {
              input: 2,
              output: 8,
            },
          },
        ],
        [
          "gpt-4.1-mini",
          {
            id: "gpt-4.1-mini",
            name: "gpt-4.1-mini",
            cost: null,
          },
        ],
      ]),
    });

    expect(catalog.get("minimax")).toEqual({
      id: "minimax",
      name: "minimax",
      modelsByLower: new Map([
        [
          "minimax-m2.5",
          {
            id: "MiniMax-M2.5",
            name: "MiniMax M2.5",
            cost: {
              input: 0.3,
            },
          },
        ],
      ]),
    });
  });
});
