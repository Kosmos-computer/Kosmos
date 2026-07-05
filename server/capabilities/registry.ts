/**
 * Capability registry — resolves "who provides this contract" and dispatches
 * intents to that provider. Callers (apps, the agent, the shell) never name
 * an implementation; they invoke intents and the registry routes them.
 *
 * v1 ships with the system providers only. The provider table exists so a
 * conforming app can later take over a contract ("default apps") without any
 * caller changing.
 */
import fs from "node:fs";
import path from "node:path";
import type { CalendarEventInput } from "../../shared/capabilities/calendar.js";
import { CALENDAR_CONTRACT_ID } from "../../shared/capabilities/calendar.js";
import { VOICE_CONTRACT_ID } from "../../shared/capabilities/voice.js";
import { intentMeta } from "../../shared/capabilities/index.js";
import { calendarService } from "../services/calendarService.js";
import { dataDirs } from "../env.js";

const PROVIDERS_FILE = path.join(dataDirs.root, "capability-providers.json");

/** contractId → providing appId, or "system" for the built-in service. */
const DEFAULT_PROVIDERS: Record<string, string> = {
  [CALENDAR_CONTRACT_ID]: "system",
  [VOICE_CONTRACT_ID]: "system",
};

/** Where the Pipecat voice service listens (voice-server/bot.py). */
const VOICE_SERVER_URL = process.env.VOICE_SERVER_URL ?? "http://localhost:4620";

export function getProviders(): Record<string, string> {
  try {
    const stored = JSON.parse(fs.readFileSync(PROVIDERS_FILE, "utf-8")) as Record<string, string>;
    return { ...DEFAULT_PROVIDERS, ...stored };
  } catch {
    return { ...DEFAULT_PROVIDERS };
  }
}

export function setProvider(contractId: string, providerId: string): void {
  const stored = getProviders();
  stored[contractId] = providerId;
  fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(stored, null, 2), "utf-8");
}

// ── System intent handlers ────────────────────────────────────────────────────

type IntentHandler = (params: Record<string, unknown>) => unknown | Promise<unknown>;

const systemHandlers: Record<string, IntentHandler> = {
  "calendar.events.list": (p) =>
    calendarService.list({
      ...(typeof p.from === "string" ? { from: p.from } : {}),
      ...(typeof p.to === "string" ? { to: p.to } : {}),
    }),
  "calendar.event.get": (p) => {
    const event = calendarService.get(String(p.id ?? ""));
    if (!event) throw new Error(`Event not found: ${String(p.id)}`);
    return event;
  },
  "calendar.event.create": (p) => calendarService.create(p as unknown as CalendarEventInput),
  "calendar.event.update": (p) => {
    const { id, ...patch } = p;
    return calendarService.update(String(id ?? ""), patch as Partial<CalendarEventInput>);
  },
  "calendar.event.delete": (p) => ({ deleted: calendarService.delete(String(p.id ?? "")) }),

  // os.voice@1 — the session itself is desktop-owned (the browser holds the
  // microphone), so start/stop can only be initiated from the shell. status
  // is the one intent the server can answer: it probes the voice service.
  "voice.status": async () => {
    try {
      const res = await fetch(`${VOICE_SERVER_URL}/status`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (!res.ok) return { available: false, reason: `voice server responded ${res.status}` };
      return { available: true, ...((await res.json().catch(() => ({}))) as object) };
    } catch {
      return { available: false, reason: "voice server unreachable" };
    }
  },
  "voice.start": () => {
    throw new Error(
      "Voice sessions are desktop-owned (the browser holds the microphone) — start voice from the shell's mic button",
    );
  },
  "voice.stop": () => {
    throw new Error(
      "Voice sessions are desktop-owned — stop voice from the shell's voice bar",
    );
  },
};

/**
 * Dispatch an intent to its contract's current provider. Permission checks
 * happen in the bridge (for apps) or the tool layer (for the agent) BEFORE
 * this runs — this function only routes.
 */
export async function invokeIntent(
  intentId: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const meta = intentMeta(intentId);
  if (!meta) throw new Error(`Unknown intent: ${intentId}`);
  const provider = getProviders()[meta.contractId] ?? "system";
  if (provider !== "system") {
    // App-hosted providers need a dispatch channel into the app (headless
    // entry or open window) — Phase 4 work. Until then the system service
    // remains authoritative and swapping means "which UI", not "which store".
    throw new Error(
      `Contract ${meta.contractId} is assigned to app "${provider}", but app-hosted providers aren't supported yet`,
    );
  }
  const handler = systemHandlers[intentId];
  if (!handler) throw new Error(`No system handler for intent: ${intentId}`);
  return await handler(params);
}
