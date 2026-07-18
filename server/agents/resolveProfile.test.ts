/**
 * Channel profile resolver tests — peer hit, miss → default, disabled fallback.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BUILTIN_AGENT_ID } from "../../shared/agents.js";

describe("resolveChannelProfile", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "arco-resolve-"));
    process.env.ARCO_DATA_DIR = tmp;
  });

  afterEach(() => {
    delete process.env.ARCO_DATA_DIR;
    fs.rmSync(tmp, { recursive: true, force: true });
    vi.resetModules();
  });

  async function load() {
    vi.resetModules();
    const { agentStore } = await import("./agentStore.js");
    const { resolveChannelProfile, resolveProfileForTurn } = await import("./resolveProfile.js");
    return { agentStore, resolveChannelProfile, resolveProfileForTurn };
  }

  it("unbound peer resolves to default (builtin)", async () => {
    const { resolveChannelProfile } = await load();
    expect(resolveChannelProfile({}).id).toBe(BUILTIN_AGENT_ID);
    expect(resolveChannelProfile({ peerProfileId: null }).id).toBe(BUILTIN_AGENT_ID);
  });

  it("peer with profileId hits that profile when enabled", async () => {
    const { agentStore, resolveChannelProfile } = await load();
    const alice = agentStore.create({ name: "Alice" });
    expect(resolveChannelProfile({ peerProfileId: alice.id }).id).toBe(alice.id);
  });

  it("disabled bound profile falls through to default", async () => {
    const { agentStore, resolveChannelProfile } = await load();
    const bob = agentStore.create({ name: "Bob" });
    agentStore.update(bob.id, { enabled: false });
    expect(resolveChannelProfile({ peerProfileId: bob.id }).id).toBe(BUILTIN_AGENT_ID);
  });

  it("missing profile id falls through to default", async () => {
    const { resolveChannelProfile } = await load();
    expect(resolveChannelProfile({ peerProfileId: "agent:user:missing" }).id).toBe(
      BUILTIN_AGENT_ID,
    );
  });

  it("resolveProfileForTurn prefers explicit id over session", async () => {
    const { agentStore, resolveProfileForTurn } = await load();
    const alice = agentStore.create({ name: "Alice" });
    expect(
      resolveProfileForTurn({ profileId: alice.id, sessionProfileId: BUILTIN_AGENT_ID }).id,
    ).toBe(alice.id);
    expect(resolveProfileForTurn({ sessionProfileId: alice.id }).id).toBe(alice.id);
  });
});
