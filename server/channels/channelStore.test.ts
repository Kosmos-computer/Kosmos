/**
 * channelStore peer binding — profileId persistence + session remint.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("channelStore peer profile bindings", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "arco-channels-"));
    process.env.ARCO_DATA_DIR = tmp;
  });

  afterEach(() => {
    delete process.env.ARCO_DATA_DIR;
    fs.rmSync(tmp, { recursive: true, force: true });
    vi.resetModules();
  });

  async function load() {
    vi.resetModules();
    return import("./channelStore.js");
  }

  it("updatePeer sets profileId and clears the chat session map", async () => {
    const { channelStore } = await load();
    const cfg = channelStore.add({ kind: "telegram", name: "TG", token: "123:abc" });
    // Approve via pairing
    const pairing = channelStore.requestPairing(cfg.id, "42", "Paul");
    const peer = channelStore.resolvePairing(cfg.id, pairing.code, true);
    expect(peer?.chatId).toBe("42");

    channelStore.setSession(cfg.id, "42", "sess-old");
    expect(channelStore.sessionFor(cfg.id, "42")).toBe("sess-old");

    const updated = channelStore.updatePeer(cfg.id, "42", { profileId: "agent:user:alice" });
    expect(updated?.profileId).toBe("agent:user:alice");
    expect(channelStore.sessionFor(cfg.id, "42")).toBeUndefined();
    expect(channelStore.peers(cfg.id)[0]?.profileId).toBe("agent:user:alice");
  });

  it("updatePeer to same profileId does not clear session", async () => {
    const { channelStore } = await load();
    const cfg = channelStore.add({ kind: "telegram", name: "TG", token: "123:abc" });
    const pairing = channelStore.requestPairing(cfg.id, "99", "Bob");
    channelStore.resolvePairing(cfg.id, pairing.code, true);
    channelStore.updatePeer(cfg.id, "99", { profileId: "agent:user:bob" });
    channelStore.setSession(cfg.id, "99", "sess-keep");
    channelStore.updatePeer(cfg.id, "99", { profileId: "agent:user:bob" });
    expect(channelStore.sessionFor(cfg.id, "99")).toBe("sess-keep");
  });
});
