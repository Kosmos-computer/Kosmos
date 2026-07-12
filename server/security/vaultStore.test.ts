import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { isOwnerOnlyMode } from "./secureFs.js";

let tempDir = "";

before(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "arco-vault-store-"));
  process.env.ARCO_DATA_DIR = tempDir;
  process.env.ARCO_SECRETS_KEK = "unit-test-kek";
  delete process.env.NODE_ENV;
});

after(() => {
  delete process.env.ARCO_DATA_DIR;
  delete process.env.ARCO_SECRETS_KEK;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("vaultStore", () => {
  it("puts, lists metadata, and returns plaintext in-process", async () => {
    const { vaultStore } = await import("./vaultStore.js");
    const meta = vaultStore.put({
      id: "settings/llm-api-key",
      name: "LLM API key",
      scope: "llm",
      plaintext: "sk-test-abcdefghijklmnopqrstuv",
      envName: "LLM_API_KEY",
    });
    assert.equal(meta.id, "settings/llm-api-key");
    assert.equal(meta.last4, "stuv");
    assert.equal(meta.scope, "llm");

    const list = vaultStore.list("llm");
    assert.equal(list.length, 1);
    assert.equal("sealed" in list[0], false);

    assert.equal(vaultStore.getPlaintext("settings/llm-api-key"), "sk-test-abcdefghijklmnopqrstuv");
  });

  it("persists ciphertext only on disk with owner-only mode", async () => {
    const vaultPath = path.join(tempDir, "secrets.vault.json");
    assert.equal(fs.existsSync(vaultPath), true);
    assert.equal(isOwnerOnlyMode(fs.statSync(vaultPath).mode), true);
    const raw = fs.readFileSync(vaultPath, "utf-8");
    assert.equal(raw.includes("sk-test-abcdefghijklmnopqrstuv"), false);
    assert.match(raw, /"ciphertext"/);
  });

  it("rotates plaintext on put with the same id", async () => {
    const { vaultStore } = await import("./vaultStore.js");
    vaultStore.put({
      id: "settings/llm-api-key",
      name: "LLM API key",
      scope: "llm",
      plaintext: "sk-rotated-new-value-9999",
    });
    assert.equal(vaultStore.getPlaintext("settings/llm-api-key"), "sk-rotated-new-value-9999");
    assert.equal(vaultStore.getMeta("settings/llm-api-key")?.last4, "9999");
  });

  it("deletes secrets", async () => {
    const { vaultStore } = await import("./vaultStore.js");
    assert.equal(vaultStore.delete("settings/llm-api-key"), true);
    assert.equal(vaultStore.getPlaintext("settings/llm-api-key"), null);
    assert.equal(vaultStore.delete("missing"), false);
  });
});
