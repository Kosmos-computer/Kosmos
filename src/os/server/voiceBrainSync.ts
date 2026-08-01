/**
 * Keep the local voice-server brain pointed at the active backend.
 *
 * STT/TTS always stay on the local voice process (MLX). The "brain" slot is
 * an OpenAI-compatible /v1 URL:
 *   - local profile  → http://localhost:4600/v1 (no token)
 *   - cloud profile  → {cloudOrigin}/v1 with the session Bearer
 *
 * Synced on boot and whenever the user switches local ↔ cloud. The voice
 * server reloads config per WebRTC session, so the next mic press picks it up.
 */
import { desktopUsesCloudProfile } from "./cloudShellMode";
import { getMobileSessionToken } from "./mobileSessionStore";
import { getActiveServerUrl } from "./serverProfileStore";
import { resolveVoiceServerUrl } from "../../voice/VoiceClient";

export type VoiceBrainSyncResult =
  | { ok: true; source: string; baseUrl: string }
  | { ok: false; error: string };

async function postBrain(body: Record<string, unknown>): Promise<VoiceBrainSyncResult> {
  const voiceUrl = resolveVoiceServerUrl();
  try {
    const res = await fetch(`${voiceUrl}/brain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2_500),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: detail || `voice brain sync failed (${res.status})` };
    }
    const json = (await res.json()) as { source?: string; baseUrl?: string };
    return {
      ok: true,
      source: json.source ?? "unknown",
      baseUrl: json.baseUrl ?? "",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/** Point voice brain at local Arco or the active cloud tenant. */
export async function syncVoiceBrainForActiveProfile(): Promise<VoiceBrainSyncResult> {
  const cloud = desktopUsesCloudProfile();
  const origin = getActiveServerUrl();
  const token = getMobileSessionToken(origin);

  if (cloud && origin && token) {
    return postBrain({
      mode: "cloud",
      source: "cloud",
      baseUrl: `${origin.replace(/\/$/, "")}/v1`,
      model: "arco-agent",
      apiKey: token,
      useArcoSettings: false,
    });
  }

  return postBrain({ mode: "local", source: "local" });
}
