/**
 * Binds the voice session to any FaceRigEngine.
 *
 * Mouth movement comes from a WebAudio analyser on the bot's remote audio
 * track — TTS-agnostic by construction (Kokoro, Piper, or a future
 * speech-to-speech model all just produce audio). The client's coarser
 * remoteAudioLevel events are ignored in favor of the analyser's
 * animation-rate envelope.
 */
import type { VoiceEvent, VoiceState } from "@shared/capabilities/voice";
import { voiceClient } from "../voice";
import type { FaceExpression, FaceRigEngine, FaceSpeakingState } from "./types";

const STATE_TO_SPEAKING: Record<VoiceState, FaceSpeakingState> = {
  idle: "idle",
  connecting: "idle",
  listening: "listening",
  userSpeaking: "userSpeaking",
  thinking: "thinking",
  botSpeaking: "speaking",
  error: "idle",
};

const STATE_TO_EXPRESSION: Record<VoiceState, FaceExpression> = {
  idle: "neutral",
  connecting: "neutral",
  listening: "attentive",
  userSpeaking: "attentive",
  thinking: "thinking",
  botSpeaking: "happy",
  error: "neutral",
};

/** RMS of typical speech peaks well below 1.0 — rescale so the mouth opens. */
const LEVEL_GAIN = 4;
/** Fast attack, slower release keeps the mouth from fluttering. */
const RELEASE = 0.75;

export class VoiceFaceDriver {
  private engine: FaceRigEngine;
  private unsubscribeEvents: (() => void) | null = null;
  private unsubscribeTrack: (() => void) | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private rafId = 0;
  private level = 0;
  private speaking = false;

  constructor(engine: FaceRigEngine) {
    this.engine = engine;
  }

  start(): void {
    this.applyState(voiceClient.getState());
    this.unsubscribeEvents = voiceClient.subscribe((event: VoiceEvent) => {
      if (event.type === "state") this.applyState(event.state);
    });
    this.unsubscribeTrack = voiceClient.onBotTrack((track) => this.attachAnalyser(track));
    this.loop();
  }

  stop(): void {
    this.unsubscribeEvents?.();
    this.unsubscribeTrack?.();
    this.unsubscribeEvents = null;
    this.unsubscribeTrack = null;
    cancelAnimationFrame(this.rafId);
    this.detachAnalyser();
  }

  private applyState(state: VoiceState): void {
    this.speaking = state === "botSpeaking";
    this.engine.setSpeakingState(STATE_TO_SPEAKING[state]);
    this.engine.setExpression(STATE_TO_EXPRESSION[state]);
  }

  private attachAnalyser(track: MediaStreamTrack | null): void {
    this.detachAnalyser();
    if (!track) return;
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(new MediaStream([track]));
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    this.audioContext = audioContext;
    this.analyser = analyser;
  }

  private detachAnalyser(): void {
    void this.audioContext?.close().catch(() => {});
    this.audioContext = null;
    this.analyser = null;
  }

  private loop = (): void => {
    this.rafId = requestAnimationFrame(this.loop);

    let target = 0;
    if (this.speaking && this.analyser) {
      const samples = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      target = Math.min(1, Math.sqrt(sum / samples.length) * LEVEL_GAIN);
    }

    this.level = target > this.level ? target : this.level * RELEASE;
    if (this.level < 0.01) this.level = 0;
    this.engine.setAudioLevel(this.level);
  };
}
