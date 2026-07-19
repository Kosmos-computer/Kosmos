import assert from "node:assert/strict";
import test from "node:test";
import {
  customProviderLabel,
  isKosmosCloudLlmEndpoint,
  KOSMOS_CLOUD_GATEWAY_URL,
  usesKosmosCloudService,
} from "./llmProviderLabels.js";

test("isKosmosCloudLlmEndpoint recognizes the hosted gateway", () => {
  assert.equal(isKosmosCloudLlmEndpoint("https://kosmos-gateway.fly.dev/v1"), true);
  assert.equal(isKosmosCloudLlmEndpoint(KOSMOS_CLOUD_GATEWAY_URL), true);
  assert.equal(isKosmosCloudLlmEndpoint("http://localhost:11434/v1"), false);
});

test("customProviderLabel prefers Kosmos on managed fly tenants", () => {
  assert.equal(
    customProviderLabel("", { billingManaged: true, deployment: "fly-tenant" }),
    "Kosmos",
  );
  assert.equal(customProviderLabel("", { billingManaged: false, deployment: "self-host" }), "Custom endpoint");
});

test("usesKosmosCloudService follows gateway base URLs", () => {
  assert.equal(
    usesKosmosCloudService("https://kosmos-gateway.fly.dev/v1", {
      billingManaged: false,
      deployment: "desktop-local",
    }),
    true,
  );
});
