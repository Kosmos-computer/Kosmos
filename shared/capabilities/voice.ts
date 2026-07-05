/**
 * os.voice@1 — full-duplex voice conversation as an OS capability.
 *
 * The shell owns exactly one voice session per desktop (one microphone, one
 * echo-cancelled audio output); the system provider is the Pipecat service
 * in voice-server/. Consumers never touch audio devices — they start/stop
 * the session and subscribe to the event stream defined here.
 *
 * Today the only consumer is the shell itself (src/voice/ + Chat app).
 * When voice goes over the app bridge, these intent ids become grant/audit
 * units like os.calendar@1's, and VoiceEvent is the payload pushed to app
 * iframes via the AppHostMessage channel.
 */

export const VOICE_CONTRACT_ID = "os.voice@1";

/**
 * The session state machine. userSpeaking→thinking happens on end-of-turn
 * (VAD + Smart Turn), thinking→botSpeaking on first TTS audio; a barge-in
 * jumps botSpeaking→userSpeaking directly.
 */
export type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "userSpeaking"
  | "thinking"
  | "botSpeaking"
  | "error";

export interface VoiceTranscript {
  text: string;
  /** False while ASR is still revising the utterance. */
  final: boolean;
}

/** Everything a consumer (chat UI, face rig, installed app) can observe. */
export type VoiceEvent =
  | { type: "state"; state: VoiceState }
  | { type: "userTranscript"; transcript: VoiceTranscript }
  | { type: "botTranscript"; transcript: VoiceTranscript }
  /** Bot output loudness, 0..1 — drives mouth movement in face rigs. */
  | { type: "audioLevel"; level: number }
  | { type: "error"; message: string };

export const VOICE_INTENTS = {
  "voice.start": "write",
  "voice.stop": "write",
  "voice.status": "read",
} as const;

export type VoiceIntentId = keyof typeof VOICE_INTENTS;

/**
 * JSON Schemas per intent — the machine-readable face of the contract,
 * mirroring os.calendar@1. All three intents take no parameters: a desktop
 * owns exactly one voice session, so there is nothing to address.
 */
export const VOICE_INTENT_SCHEMAS: Record<VoiceIntentId, Record<string, unknown>> = {
  "voice.start": { type: "object", properties: {} },
  "voice.stop": { type: "object", properties: {} },
  "voice.status": { type: "object", properties: {} },
};
