/**
 * Cursor SDK connection helpers — validate API keys and list models for Settings.
 */
import { Cursor, CursorAgentError } from "@cursor/sdk";
import type { CursorConnectionStatus, CursorModelInfo } from "../../shared/types.js";
import { loadSettings, resolveCursorApiKey } from "../env.js";

function resolveKey(override?: string): string {
  const key = override?.trim() || resolveCursorApiKey(loadSettings());
  if (!key) {
    throw new Error(
      "No Cursor API key configured. Create one at cursor.com/dashboard/integrations and add it in Settings → Agent.",
    );
  }
  return key;
}

/** Validate a Cursor API key via Cursor.me(). */
export async function testCursorConnection(apiKeyOverride?: string): Promise<CursorConnectionStatus> {
  try {
    const apiKey = resolveKey(apiKeyOverride);
    const user = await Cursor.me({ apiKey });
    return {
      connected: true,
      user: {
        apiKeyName: user.apiKeyName,
        userEmail: user.userEmail,
      },
    };
  } catch (err) {
    const message =
      err instanceof CursorAgentError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Cursor connection failed";
    return { connected: false, error: message };
  }
}

/** List models available to the authenticated Cursor account. */
export async function listCursorModels(apiKeyOverride?: string): Promise<CursorModelInfo[]> {
  const apiKey = resolveKey(apiKeyOverride);
  const models = await Cursor.models.list({ apiKey });
  return models.map((m) => ({ id: m.id, displayName: m.displayName }));
}
