import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

let tempDir = "";

before(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "arco-settings-secrets-"));
  process.env.ARCO_DATA_DIR = tempDir;
  process.env.ARCO_SECRETS_KEK = "settings-secrets-test-kek";
  delete process.env.LLM_API_KEY;
  delete process.env.CURSOR_API_KEY;
  delete process.env.NODE_ENV;
});

after(() => {
  delete process.env.ARCO_DATA_DIR;
  delete process.env.ARCO_SECRETS_KEK;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("settings secrets vault integration", () => {
  it("saveSettings seals apiKey and leaves settings.json without plaintext", async () => {
    const { saveSettings, loadSettings, maskSettings } = await import("../env.js");

    const saved = saveSettings({
      apiKey: "sk-integration-test-key-1234",
      model: "gpt-test",
    });
    assert.equal(saved.apiKey, "sk-integration-test-key-1234", "in-memory load is hydrated");
    assert.equal(saved.model, "gpt-test");

    const onDisk = JSON.parse(fs.readFileSync(path.join(tempDir, "settings.json"), "utf-8")) as {
      apiKey: string;
    };
    assert.equal(onDisk.apiKey, "");
    assert.equal(fs.readFileSync(path.join(tempDir, "secrets.vault.json"), "utf-8").includes("sk-integration"), false);

    const loaded = loadSettings();
    assert.equal(loaded.apiKey, "sk-integration-test-key-1234");

    const masked = maskSettings(loaded);
    assert.equal(masked.apiKey, "••••1234");
  });

  it("migrates legacy plaintext settings.json into the vault on load", async () => {
    fs.writeFileSync(
      path.join(tempDir, "settings.json"),
      JSON.stringify({ apiKey: "sk-legacy-plain-9999", provider: "custom" }, null, 2),
      "utf-8",
    );
    // Re-import is cached — call loadSettings from already-loaded module.
    const { loadSettings } = await import("../env.js");
    const loaded = loadSettings();
    assert.equal(loaded.apiKey, "sk-legacy-plain-9999");

    const onDisk = JSON.parse(fs.readFileSync(path.join(tempDir, "settings.json"), "utf-8")) as {
      apiKey: string;
    };
    assert.equal(onDisk.apiKey, "");
  });

  it("ignores masked apiKey echoes on save", async () => {
    const { saveSettings, loadSettings } = await import("../env.js");
    saveSettings({ apiKey: "••••1234" });
    assert.equal(loadSettings().apiKey, "sk-legacy-plain-9999");
  });
});
