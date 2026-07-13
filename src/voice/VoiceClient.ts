/**
 * The shell's os.voice@1 client — a singleton because a desktop has exactly
 * one microphone session and one echo-cancelled audio output. Consumers
 * (Chat app, face rig, later: installed apps over the bridge) subscribe to
 * VoiceEvents; none of them touch WebRTC or audio devices directly.
 *
 * Under the hood this wraps the Pipecat browser client over SmallWebRTC.
 * That detail is deliberately not exposed: the VoiceEvent contract is the
 * seam that survives an engine swap (different transport, or a future
 * speech-to-speech pipeline on the server).
 */
import { PipecatClient } from "@pipecat-ai/client-js";
import { SmallWebRTCTransport, WavMediaManager } from "@pipecat-ai/small-webrtc-transport";
import type { VoiceEvent, VoiceState } from "@shared/capabilities/voice";

const VOICE_PORT = 4630;
const CONNECT_TIMEOUT_MS = 45_000;
/** If STT/LLM never produce bot speech, leave Thinking… so the mic feels alive. */
const THINKING_TIMEOUT_MS = 8_000;

/**
 * Prefer an explicit Vite override; otherwise talk to the voice server on the
 * same hostname the page uses so `http://127.0.0.1:4610` does not call
 * `http://localhost:4630` (different origins / IPv4 vs IPv6 surprises).
 */
export function resolveVoiceServerUrl(): string {
  const fromEnv = import.meta.env.VITE_VOICE_SERVER_URL as string | undefined;
  if (fromEnv?.trim()) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `http://${window.location.hostname}:${VOICE_PORT}`;
  }
  return `http://localhost:${VOICE_PORT}`;
}

/** @deprecated Prefer resolveVoiceServerUrl() — kept for existing imports. */
export const VOICE_SERVER_URL: string = resolveVoiceServerUrl();

type VoiceListener = (event: VoiceEvent) => void;
type TrackListener = (track: MediaStreamTrack | null) => void;

class VoiceClient {
  private client: PipecatClient | null = null;
  private state: VoiceState = "idle";
  private listeners = new Set<VoiceListener>();
  private trackListeners = new Set<TrackListener>();
  private botTrack: MediaStreamTrack | null = null;
  /** Audible playback of the bot's voice. The transport only delivers the
   *  WebRTC track; actually hearing it requires an HTMLAudioElement. */
  private audioEl: HTMLAudioElement | null = null;
  private connectAbort: AbortController | null = null;
  private restoreFetch: (() => void) | null = null;
  private thinkingTimer: number | null = null;

  getState(): VoiceState {
    return this.state;
  }

  /** The bot's remote audio track — used by face rigs for amplitude analysis. */
  getBotAudioTrack(): MediaStreamTrack | null {
    return this.botTrack;
  }

  subscribe(listener: VoiceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onBotTrack(listener: TrackListener): () => void {
    this.trackListeners.add(listener);
    if (this.botTrack) listener(this.botTrack);
    return () => this.trackListeners.delete(listener);
  }

  /** Probe the voice server so UIs can disable the mic when it's down. */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${resolveVoiceServerUrl()}/status`, {
        signal: AbortSignal.timeout(1500),
      });
      if (!res.ok) return false;
      const body = (await res.json()) as { status?: string };
      return body.status === "ready";
    } catch {
      return false;
    }
  }

  async start(): Promise<void> {
    // A previous attempt may have left us mid-connect with a half-built client.
    if (this.client || this.state === "connecting") {
      await this.stop();
    }
    this.setState("connecting");

    const voiceUrl = resolveVoiceServerUrl();
    const connectAbort = new AbortController();
    this.connectAbort = connectAbort;

    // Barge-in depends on the bot not hearing itself: browser AEC filters the
    // bot's own audio out of the mic before it ever reaches the VAD.
    const client = new PipecatClient({
      transport: new SmallWebRTCTransport({
        // Default DailyMediaManager pulls call-machine JS from c.daily.co and
        // fails offline / behind blockers. WavMediaManager is pure WebRTC getUserMedia.
        mediaManager: new WavMediaManager(),
      }),
      enableMic: true,
      enableCam: false,
      callbacks: {
        onConnected: () => this.setState("listening"),
        onDisconnected: () => this.teardown(),
        onUserStartedSpeaking: () => {
          this.clearThinkingTimer();
          this.setState("userSpeaking");
        },
        onUserStoppedSpeaking: () => {
          this.setState("thinking");
          this.armThinkingTimer();
        },
        onBotStartedSpeaking: () => {
          this.clearThinkingTimer();
          this.setState("botSpeaking");
        },
        onBotStoppedSpeaking: () => {
          this.clearThinkingTimer();
          this.setState("listening");
        },
        onUserTranscript: (data) => {
          this.emit({
            type: "userTranscript",
            transcript: { text: data.text, final: data.final },
          });
          // Empty finals mean the server dropped the turn — don't stay on Thinking…
          if (data.final && !data.text.trim() && this.state === "thinking") {
            this.clearThinkingTimer();
            this.setState("listening");
          }
        },
        onBotTranscript: (data) =>
          this.emit({
            type: "botTranscript",
            transcript: { text: data.text, final: true },
          }),
        onRemoteAudioLevel: (level) => this.emit({ type: "audioLevel", level }),
        onTrackStarted: (track, participant) => {
          // SmallWebRTC may omit participant metadata for the bot's track —
          // treat anything not explicitly local as the bot.
          if (track.kind === "audio" && !participant?.local) {
            this.botTrack = track;
            this.playBotAudio(track);
            this.trackListeners.forEach((l) => l(track));
          }
        },
        onError: (message) => {
          this.emit({ type: "error", message: String(message.data ?? "Voice error") });
        },
      },
    });

    this.client = client;
    const timeout = window.setTimeout(() => connectAbort.abort(), CONNECT_TIMEOUT_MS);
    // Pipecat's makeRequest builds `new Request(url, { body })` then `fetch(request)`.
    // In Chromium, that cross-origin path makes FastAPI see the JSON body as a raw
    // string (422 dataclass_type). Replaying the same bytes via fetch(url, init) works.
    // Keep the patch for the whole session — renegotiation POSTs the offer again.
    this.restoreFetch?.();
    this.restoreFetch = installOfferFetchFix();

    try {
      // Ask for the mic up front so a blocked permission fails fast with a
      // clear error instead of hanging forever in "Connecting…".
      await client.initDevices();
      if (connectAbort.signal.aborted) throw new Error("Voice connection timed out");

      await Promise.race([
        client.connect({
          webrtcRequestParams: { endpoint: `${voiceUrl}/api/offer` },
        }),
        new Promise<never>((_, reject) => {
          connectAbort.signal.addEventListener("abort", () => {
            reject(new Error("Voice connection timed out — is the mic allowed?"));
          });
        }),
      ]);
    } catch (err) {
      try {
        await client.disconnect();
      } catch {
        // ignore disconnect errors during failed start
      }
      this.teardown();
      this.setState("error");
      throw new Error(formatVoiceConnectError(err));
    } finally {
      window.clearTimeout(timeout);
      if (this.connectAbort === connectAbort) this.connectAbort = null;
    }
  }

  async stop(): Promise<void> {
    this.connectAbort?.abort();
    this.connectAbort = null;
    const client = this.client;
    this.client = null;
    if (client) {
      try {
        await client.disconnect();
      } catch {
        // ignore
      }
    }
    this.teardown();
  }

  private playBotAudio(track: MediaStreamTrack): void {
    if (!this.audioEl) {
      const el = document.createElement("audio");
      el.autoplay = true;
      el.style.display = "none";
      document.body.appendChild(el);
      this.audioEl = el;
    }
    this.audioEl.srcObject = new MediaStream([track]);
    // start() runs from a user gesture, so autoplay policy allows this.
    void this.audioEl.play().catch(() => {});
  }

  private teardown(): void {
    this.clearThinkingTimer();
    this.restoreFetch?.();
    this.restoreFetch = null;
    this.client = null;
    this.botTrack = null;
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.srcObject = null;
      this.audioEl.remove();
      this.audioEl = null;
    }
    this.trackListeners.forEach((l) => l(null));
    this.setState("idle");
  }

  private armThinkingTimer(): void {
    this.clearThinkingTimer();
    this.thinkingTimer = window.setTimeout(() => {
      this.thinkingTimer = null;
      if (this.state === "thinking") this.setState("listening");
    }, THINKING_TIMEOUT_MS);
  }

  private clearThinkingTimer(): void {
    if (this.thinkingTimer != null) {
      window.clearTimeout(this.thinkingTimer);
      this.thinkingTimer = null;
    }
  }

  private setState(state: VoiceState): void {
    if (this.state === state) return;
    this.state = state;
    this.emit({ type: "state", state });
  }

  private emit(event: VoiceEvent): void {
    this.listeners.forEach((l) => l(event));
  }
}

/**
 * Chromium + cross-origin `fetch(Request)` against Pipecat's FastAPI offer
 * endpoint yields 422 ("body is a string, not a dict"). Flatten to fetch(url, init).
 */
function installOfferFetchFix(): () => void {
  const orig = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (input instanceof Request && /\/api\/offer\/?$/.test(input.url)) {
      const headers = new Headers(input.headers);
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      let body = init?.body;
      if (body == null && input.method !== "GET" && input.method !== "HEAD") {
        body = await input.clone().text();
      }
      // Drop null pc_id so PATCH/POST schemas that require string stay happy.
      if (typeof body === "string" && body.includes('"pc_id":null')) {
        try {
          const parsed = JSON.parse(body) as Record<string, unknown>;
          if (parsed.pc_id == null) delete parsed.pc_id;
          body = JSON.stringify(parsed);
        } catch {
          // keep original body
        }
      }
      return orig(input.url, {
        method: input.method,
        headers,
        body,
        mode: input.mode,
        credentials: input.credentials,
        cache: input.cache,
        redirect: input.redirect,
        referrer: input.referrer,
        integrity: input.integrity,
        signal: init?.signal ?? input.signal,
      });
    }
    return orig(input, init);
  }) as typeof window.fetch;
  return () => {
    window.fetch = orig;
  };
}

function formatVoiceConnectError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  if (typeof Response !== "undefined" && err instanceof Response) {
    return `Voice server returned ${err.status}`;
  }
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (message) return String(message);
  }
  try {
    const serialized = JSON.stringify(err);
    if (serialized && serialized !== "{}") return serialized;
  } catch {
    // ignore
  }
  return "Voice connection failed";
}

/** The one voice session for this desktop. */
export const voiceClient = new VoiceClient();

// Debug handle for the console (single-user local shell; nothing sensitive).
declare global {
  interface Window {
    __arcoVoice?: VoiceClient;
  }
}
if (typeof window !== "undefined") window.__arcoVoice = voiceClient;
