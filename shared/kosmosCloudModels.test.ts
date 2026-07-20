import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  costTierFromBlendedUsd,
  formatKosmosCostDots,
  formatKosmosModelMeta,
  kosmosModelsFromOpenRouterPayload,
  speedTierFromModel,
  toKosmosGatewayModelId,
} from "./kosmosCloudModels.js";

describe("kosmosCloudModels", () => {
  it("formats cost dots 1–4", () => {
    assert.equal(formatKosmosCostDots(1), "•ooo");
    assert.equal(formatKosmosCostDots(2), "••oo");
    assert.equal(formatKosmosCostDots(3), "•••o");
    assert.equal(formatKosmosCostDots(4), "••••");
  });

  it("formats meta as Speed · dots", () => {
    assert.equal(formatKosmosModelMeta("fast", 1), "Fast · •ooo");
    assert.equal(formatKosmosModelMeta("high", 4), "High · ••••");
  });

  it("buckets cost from blended USD/MTok", () => {
    assert.equal(costTierFromBlendedUsd(0), 1);
    assert.equal(costTierFromBlendedUsd(0.2), 1);
    assert.equal(costTierFromBlendedUsd(1), 2);
    assert.equal(costTierFromBlendedUsd(5), 3);
    assert.equal(costTierFromBlendedUsd(20), 4);
  });

  it("classifies flash/mini as fast and opus/pro as high", () => {
    assert.equal(speedTierFromModel("google/gemini-flash", "Gemini Flash", 1), "fast");
    assert.equal(speedTierFromModel("anthropic/claude-opus", "Claude Opus", 10), "high");
    assert.equal(speedTierFromModel("qwen/qwen3-32b", "Qwen 32B", 1), "med");
  });

  it("prefixes openrouter/ for gateway routing", () => {
    assert.equal(toKosmosGatewayModelId("anthropic/claude-sonnet-4.5"), "openrouter/anthropic/claude-sonnet-4.5");
    assert.equal(toKosmosGatewayModelId("openrouter/openai/gpt-4o"), "openrouter/openai/gpt-4o");
  });

  it("builds catalog with friendly aliases first", () => {
    const models = kosmosModelsFromOpenRouterPayload({
      data: [
        {
          id: "openai/gpt-4o-mini",
          name: "OpenAI: GPT-4o Mini",
          architecture: { output_modalities: ["text"], modality: "text->text" },
          pricing: { prompt: "0.00000015", completion: "0.0000006" },
        },
        {
          id: "qwen/qwen3-30b-a3b-instruct-2507",
          name: "Qwen: Qwen3 30B",
          architecture: { output_modalities: ["text"] },
          pricing: { prompt: "0.0000001", completion: "0.0000002" },
        },
      ],
    });
    assert.equal(models[0]?.id, "qwen3-30b");
    assert.ok(models.some((m) => m.id === "openrouter/openai/gpt-4o-mini"));
    assert.ok(!models.some((m) => m.id === "openrouter/qwen/qwen3-30b-a3b-instruct-2507"));
  });
});
