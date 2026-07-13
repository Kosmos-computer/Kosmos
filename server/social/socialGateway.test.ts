/**
 * socialGateway connect validation — failed connect must not persist accounts.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "arco-social-gateway-"));
process.env.ARCO_DATA_DIR = tempDir;

const { socialGateway } = await import("./socialGateway.js");
const { socialStore } = await import("./socialStore.js");

describe("socialGateway.connectWithAppPassword", () => {
  before(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });

  after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("rejects empty credentials without writing an account", async () => {
    await assert.rejects(
      () =>
        socialGateway.connectWithAppPassword("user-1", {
          handle: "",
          appPassword: "xxxx-xxxx-xxxx-xxxx",
        }),
      /handle is required/i,
    );
    assert.equal(socialStore.listForUser("user-1").length, 0);

    await assert.rejects(
      () =>
        socialGateway.connectWithAppPassword("user-1", {
          handle: "alice.bsky.social",
          appPassword: "",
        }),
      /app password is required/i,
    );
    assert.equal(socialStore.listForUser("user-1").length, 0);
  });
});

describe("socialGateway.connectMastodon", () => {
  it("rejects empty credentials without writing an account", async () => {
    await assert.rejects(
      () =>
        socialGateway.connectMastodon("user-2", {
          instanceUrl: "",
          accessToken: "token",
        }),
      /instance URL is required/i,
    );
    assert.equal(socialStore.listForUser("user-2").length, 0);

    await assert.rejects(
      () =>
        socialGateway.connectMastodon("user-2", {
          instanceUrl: "https://mastodon.social",
          accessToken: "",
        }),
      /access token is required/i,
    );
    assert.equal(socialStore.listForUser("user-2").length, 0);
  });
});

describe("socialGateway.connectWithNostrKey", () => {
  it("rejects empty nsec without writing an account", async () => {
    await assert.rejects(
      () =>
        socialGateway.connectWithNostrKey("user-2", {
          nsec: "",
          relays: ["wss://relay.snort.social"],
        }),
      /private key is required/i,
    );
    assert.equal(socialStore.listForUser("user-2").length, 0);
  });

  it("connects with a generated hex key and default relays", async () => {
    const { generateSecretKey } = await import("nostr-tools");
    const hex = Buffer.from(generateSecretKey()).toString("hex");
    const account = await socialGateway.connectWithNostrKey("user-3", {
      nsec: hex,
      relays: [],
    });
    assert.equal(account.provider, "nostr");
    assert.ok(account.handle.startsWith("npub1"));
    assert.ok(Array.isArray(account.relays));
    assert.ok((account.relays?.length ?? 0) > 0);
    assert.equal(socialStore.listForUser("user-3").length, 1);
    socialStore.disconnect("user-3", account.id);
  });

  it("updates relays without re-entering nsec", async () => {
    const { generateSecretKey } = await import("nostr-tools");
    const hex = Buffer.from(generateSecretKey()).toString("hex");
    const account = await socialGateway.connectWithNostrKey("user-3b", {
      nsec: hex,
      relays: ["wss://relay.snort.social"],
    });
    const updated = socialGateway.updateNostrRelays("user-3b", account.id, {
      relays: ["wss://nos.lol", "wss://relay.damus.io/"],
    });
    assert.deepEqual(updated.relays, ["wss://nos.lol", "wss://relay.damus.io"]);
    assert.throws(
      () =>
        socialGateway.updateNostrRelays("user-3b", account.id, {
          relays: ["https://not-a-relay"],
        }),
      /no valid/i,
    );
    const reset = socialGateway.updateNostrRelays("user-3b", account.id, { relays: [] });
    assert.ok((reset.relays?.length ?? 0) > 1);
    socialStore.disconnect("user-3b", account.id);
  });
});

describe("socialGateway.connectTwitter", () => {
  it("rejects empty access token without writing an account", async () => {
    await assert.rejects(
      () => socialGateway.connectTwitter("user-4", { accessToken: "" }),
      /access token is required/i,
    );
    assert.equal(socialStore.listForUser("user-4").length, 0);
  });
});

describe("socialGateway.connectFacebook", () => {
  it("rejects empty access token without writing an account", async () => {
    await assert.rejects(
      () => socialGateway.connectFacebook("user-5", { accessToken: "" }),
      /access token is required/i,
    );
    assert.equal(socialStore.listForUser("user-5").length, 0);
  });
});

describe("socialGateway.connectReddit", () => {
  it("rejects empty access token without writing an account", async () => {
    await assert.rejects(
      () => socialGateway.connectReddit("user-6", { accessToken: "" }),
      /access token is required/i,
    );
    assert.equal(socialStore.listForUser("user-6").length, 0);
  });
});

describe("socialGateway.connectBitsocial", () => {
  it("defaults blank RPC URL to the local daemon endpoint", async () => {
    const { normalizeBitsocialRpcUrl, BITSOCIAL_DEFAULT_RPC } = await import(
      "./adapters/bitsocial.js"
    );
    assert.equal(normalizeBitsocialRpcUrl(""), BITSOCIAL_DEFAULT_RPC);
    assert.equal(normalizeBitsocialRpcUrl("  "), BITSOCIAL_DEFAULT_RPC);
  });
});
