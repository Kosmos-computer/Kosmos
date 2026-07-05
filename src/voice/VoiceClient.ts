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
import { SmallWebRTCTransport } from "@pipecat-ai/small-webrtc-transport";
import type { VoiceEvent, VoiceState } from "@shared/capabilities/voice";

/** The Pipecat voice server (voice-server/). Same-machine by design. */
const VOICE_SERVER_URL: string =
  (import.meta.env.VITE_VOICE_SERVER_URL as string | undefined) ?? "http://localhost:4620";

type VoiceListener = (event: VoiceEvent) => void;
type TrackListener = (track: MediaStreamTrack | null) => void;

class VoiceClient {
  private client: PipecatClient | null = null;
  private state: VoiceState = "idle";
  private listeners = new Set<VoiceListener>();
  private trackListeners = new Set<TrackListener>();
  private botTrack: MediaStreamTrack | null = null;

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
      const res = await fetch(`${VOICE_SERVER_URL}/status`, {
        signal: AbortSignal.timeout(1500),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async start(): Promise<void> {
    if (this.client) return;
    this.setState("connecting");

    // Barge-in depends on the bot not hearing itself: browser AEC filters the
    // bot's own audio out of the mic before it ever reaches the VAD.
    const client = new PipecatClient({
      transport: new SmallWebRTCTransport(),
      enableMic: true,
      enableCam: false,
      callbacks: {
        onConnected: () => this.setState("listening"),
        onDisconnected: () => this.teardown(),
        onUserStartedSpeaking: () => this.setState("userSpeaking"),
        onUserStoppedSpeaking: () => this.setState("thinking"),
        onBotStartedSpeaking: () => this.setState("botSpeaking"),
        onBotStoppedSpeaking: () => this.setState("listening"),
        onUserTranscript: (data) =>
          this.emit({
            type: "userTranscript",
            transcript: { text: data.text, final: data.final },
          }),
        onBotTranscript: (data) =>
          this.emit({
            type: "botTranscript",
            transcript: { text: data.text, final: true },
          }),
        onRemoteAudioLevel: (level) => this.emit({ type: "audioLevel", level }),
        onTrackStarted: (track, participant) => {
          if (track.kind === "audio" && participant && !participant.local) {
            this.botTrack = track;
            this.trackListeners.forEach((l) => l(track));
          }
        },
        onError: (message) => {
          this.emit({ type: "error", message: String(message.data ?? "Voice error") });
        },
      },
    });

    this.client = client;
    try {
      await client.connect({ webrtcUrl: `${VOICE_SERVER_URL}/api/offer` });
    } catch (err) {
      this.teardown();
      this.setState("error");
      throw err instanceof Error ? err : new Error("Voice connection failed");
    }
  }

  async stop(): Promise<void> {
    const client = this.client;
    if (!client) return;
    this.client = null;
    try {
      await client.disconnect();
    } finally {
      this.teardown();
    }
  }

  private teardown(): void {
    this.client = null;
    this.botTrack = null;
    this.trackListeners.forEach((l) => l(null));
    this.setState("idle");
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

/** The one voice session for this desktop. */
export const voiceClient = new VoiceClient();
