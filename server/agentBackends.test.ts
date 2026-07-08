import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { resolveActiveAgentBackend } from "./env.js";
import type { AgentBackend, Settings } from "../shared/types.js";

function makeSettings(agentBackends: AgentBackend[], activeAgentBackendId: string | null): Settings {
  return { agentBackends, activeAgentBackendId } as unknown as Settings;
}

const openhandsBackend: AgentBackend = {
  id: "oh1",
  name: "Local OpenHands",
  kind: "openhands",
  host: "http://localhost:3000",
  apiKey: "secret",
  variant: "local",
};

const kosmosBackend: AgentBackend = {
  id: "k1",
  name: "Remote kosmos",
  kind: "kosmos",
  host: "http://example.com",
  apiKey: "token",
};

describe("resolveActiveAgentBackend", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    delete process.env.OPENHANDS_HOST;
    delete process.env.OPENHANDS_API_KEY;
    delete process.env.KOSMOS_REMOTE_HOST;
    delete process.env.KOSMOS_REMOTE_TOKEN;
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns the entry matching activeAgentBackendId", () => {
    const settings = makeSettings([openhandsBackend, kosmosBackend], "k1");
    assert.deepEqual(resolveActiveAgentBackend(settings, "kosmos"), kosmosBackend);
  });

  it("falls back to the sole candidate of that kind when no active id matches", () => {
    const settings = makeSettings([openhandsBackend], "does-not-exist");
    assert.deepEqual(resolveActiveAgentBackend(settings, "openhands"), openhandsBackend);
  });

  it("does not cross kinds when falling back to a sole candidate", () => {
    const settings = makeSettings([openhandsBackend], null);
    assert.equal(resolveActiveAgentBackend(settings, "kosmos"), null);
  });

  it("falls back to env vars when nothing is registered", () => {
    process.env.KOSMOS_REMOTE_HOST = "http://env-host";
    process.env.KOSMOS_REMOTE_TOKEN = "env-token";
    const settings = makeSettings([], null);
    assert.deepEqual(resolveActiveAgentBackend(settings, "kosmos"), {
      id: "env-default",
      name: "Default (env)",
      kind: "kosmos",
      host: "http://env-host",
      apiKey: "env-token",
    });
  });

  it("returns null when nothing is registered and no env fallback is set", () => {
    const settings = makeSettings([], null);
    assert.equal(resolveActiveAgentBackend(settings, "openhands"), null);
  });
});
