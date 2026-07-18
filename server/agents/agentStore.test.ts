/**
 * Agent store tests — seed, create, resolve, protect builtin.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BUILTIN_AGENT_ID } from "../../shared/agents.js";

describe("agentStore", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "arco-agents-"));
    process.env.ARCO_DATA_DIR = tmp;
  });

  afterEach(() => {
    delete process.env.ARCO_DATA_DIR;
    fs.rmSync(tmp, { recursive: true, force: true });
    vi.resetModules();
  });

  async function loadStore() {
    vi.resetModules();
    const { agentStore } = await import("./agentStore.js");
    return agentStore;
  }

  it("seeds builtin on first list", async () => {
    const store = await loadStore();
    const list = store.list();
    expect(list.some((p) => p.id === BUILTIN_AGENT_ID)).toBe(true);
    expect(store.getDefault().id).toBe(BUILTIN_AGENT_ID);
  });

  it("creates a user profile cloned from builtin", async () => {
    const store = await loadStore();
    const alice = store.create({ name: "Alice", tagline: "Helpful peer" });
    expect(alice.id).toBe("agent:user:alice");
    expect(alice.principalId).toBe("agent:user:alice");
    expect(alice.runtime.kind).toBe("builtin");
    expect(alice.source).toBe("user");
    expect(store.get("agent:user:alice")?.name).toBe("Alice");
  });

  it("resolve falls back when disabled or missing", async () => {
    const store = await loadStore();
    const bob = store.create({ name: "Bob" });
    store.update(bob.id, { enabled: false });
    expect(store.resolve(bob.id).id).toBe(BUILTIN_AGENT_ID);
    expect(store.resolve("agent:user:missing").id).toBe(BUILTIN_AGENT_ID);
  });

  it("refuses to delete or disable builtin", async () => {
    const store = await loadStore();
    expect(() => store.remove(BUILTIN_AGENT_ID)).toThrow(/built-in/i);
    expect(() => store.update(BUILTIN_AGENT_ID, { enabled: false })).toThrow(/built-in/i);
  });
});
