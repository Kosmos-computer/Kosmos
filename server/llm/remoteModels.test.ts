import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KOSMOS_CLOUD_GATEWAY_URL } from "../../shared/llmProviderLabels.js";
import type { Settings } from "../../shared/types.js";
import { resolveRemoteListApiKey } from "./remoteModels.js";

function settings(partial: Partial<Settings>): Settings {
  return {
    provider: "custom",
    baseUrl: "",
    apiKey: "",
    wallpaper: "",
    agent: "builtin",
    acpCommand: "",
    cursorApiKey: "",
    cursorModel: "",
    cursorRuntime: "local",
    cursorRepoUrl: "",
    agentBackends: [],
    activeAgentBackendId: null,
    ...partial,
  } as Settings;
}

describe("resolveRemoteListApiKey", () => {
  it("does not send an OpenAI settings key to the Kosmos gateway", () => {
    const resolved = resolveRemoteListApiKey(
      KOSMOS_CLOUD_GATEWAY_URL,
      settings({
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-openai-not-for-gateway",
      }),
    );
    assert.equal("code" in resolved, true);
    if ("code" in resolved) assert.equal(resolved.code, "auth_required");
  });

  it("reuses settings.apiKey when the saved connection is already Kosmos", () => {
    const resolved = resolveRemoteListApiKey(
      KOSMOS_CLOUD_GATEWAY_URL,
      settings({
        baseUrl: KOSMOS_CLOUD_GATEWAY_URL,
        apiKey: "sk-kosmos-virtual",
      }),
    );
    assert.deepEqual(resolved, { apiKey: "sk-kosmos-virtual" });
  });

  it("prefers apiKeys.kosmos for the gateway", () => {
    const resolved = resolveRemoteListApiKey(
      KOSMOS_CLOUD_GATEWAY_URL,
      settings({
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-openai",
        apiKeys: { kosmos: "sk-kosmos-dedicated" },
      }),
    );
    assert.deepEqual(resolved, { apiKey: "sk-kosmos-dedicated" });
  });
});
