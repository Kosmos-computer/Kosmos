/**
 * Move LLM / Cursor API keys from plaintext settings.json into the vault.
 *
 * - On save: real keys (not mask echoes) are sealed; settings keeps "".
 * - On load: hydrate apiKey / cursorApiKey from the vault for in-process use.
 * - Masked values (`••••xxxx`) are ignored on write (existing convention).
 */
import type { Settings } from "../../shared/types.js";
import { SETTINGS_VAULT_IDS, vaultStore } from "./vaultStore.js";

function isMaskedSecret(value: string | undefined): boolean {
  return Boolean(value && value.includes("••••"));
}

function sealField(
  plaintext: string | undefined,
  id: string,
  name: string,
  envName: string,
): void {
  if (plaintext === undefined) return;
  if (isMaskedSecret(plaintext)) return;
  if (!plaintext.trim()) {
    vaultStore.delete(id);
    return;
  }
  vaultStore.put({
    id,
    name,
    scope: "llm",
    plaintext: plaintext.trim(),
    envName,
  });
}

/** Persist secrets from a settings patch/merge into the vault; clear plaintext fields. */
export function sealSettingsSecrets(settings: Settings): Settings {
  sealField(settings.apiKey, SETTINGS_VAULT_IDS.apiKey, "LLM API key", "LLM_API_KEY");
  sealField(
    settings.cursorApiKey,
    SETTINGS_VAULT_IDS.cursorApiKey,
    "Cursor API key",
    "CURSOR_API_KEY",
  );

  // Per-provider keys map
  if (settings.apiKeys) {
    for (const [ref, key] of Object.entries(settings.apiKeys)) {
      const id = `settings/apiKeys/${ref}`;
      sealField(key, id, `API key (${ref})`, ref);
    }
  }

  return {
    ...settings,
    apiKey: "",
    cursorApiKey: "",
    ...(settings.apiKeys
      ? { apiKeys: Object.fromEntries(Object.keys(settings.apiKeys).map((ref) => [ref, ""])) }
      : {}),
  };
}

/** One-time migrate: if settings still has plaintext keys, seal them. */
export function migratePlaintextSettingsKeys(settings: Settings): Settings {
  const needsMigrate =
    (settings.apiKey && !isMaskedSecret(settings.apiKey)) ||
    (settings.cursorApiKey && !isMaskedSecret(settings.cursorApiKey)) ||
    (settings.apiKeys &&
      Object.values(settings.apiKeys).some((k) => k && !isMaskedSecret(k)));
  if (!needsMigrate) return hydrateSettingsSecrets(settings);
  const sealed = sealSettingsSecrets(settings);
  return hydrateSettingsSecrets(sealed);
}

/** Fill apiKey fields from vault for server-side consumers. */
export function hydrateSettingsSecrets(settings: Settings): Settings {
  const apiKey =
    vaultStore.getPlaintext(SETTINGS_VAULT_IDS.apiKey) ?? settings.apiKey ?? "";
  const cursorApiKey =
    vaultStore.getPlaintext(SETTINGS_VAULT_IDS.cursorApiKey) ?? settings.cursorApiKey ?? "";

  let apiKeys = settings.apiKeys;
  if (apiKeys) {
    apiKeys = { ...apiKeys };
    for (const ref of Object.keys(apiKeys)) {
      const fromVault = vaultStore.getPlaintext(`settings/apiKeys/${ref}`);
      if (fromVault) apiKeys[ref] = fromVault;
    }
  }

  return { ...settings, apiKey, cursorApiKey, ...(apiKeys ? { apiKeys } : {}) };
}
