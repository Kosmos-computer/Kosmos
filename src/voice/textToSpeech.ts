/**
 * One-shot "read aloud" for a chat message — hits the same local voice
 * server VoiceClient talks to, but bypasses the conversational WebRTC
 * pipeline entirely: plain text in, a WAV file out, synthesized with
 * whatever engine/voice voice.config.json configures. That's what makes it
 * "the same voice" as the live assistant instead of the browser's own TTS.
 *
 * Only one message reads aloud at a time: starting a new one stops whatever
 * was already playing (and tells its caller so the UI can reset).
 */
import { parseSegments } from "../components/richmarkdown/parseSegments";
import { resolveVoiceServerUrl } from "./VoiceClient";

export interface SpeakHandlers {
  /** Fired once playback actually starts (after synthesis latency). */
  onStart?: () => void;
  /** Fired when playback finishes naturally, is stopped, or is superseded. */
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

interface Session {
  audio: HTMLAudioElement | null;
  controller: AbortController;
  handlers: SpeakHandlers;
}

let active: Session | null = null;

function stopActive(): void {
  const session = active;
  if (!session) return;
  active = null;
  session.controller.abort();
  if (session.audio) {
    session.audio.pause();
    session.audio.src = "";
  }
  session.handlers.onEnd?.();
}

/** Stop whatever message is currently reading aloud, if any. */
export function stopSpeaking(): void {
  stopActive();
}

/**
 * Reduce chat markdown to plain, speakable prose: drop fenced openui-lang /
 * widget blocks (not speech content) and strip markdown syntax from what's
 * left so TTS doesn't read out asterisks, hashes, or link brackets.
 */
export function toSpeakableText(raw: string): string {
  const prose = parseSegments(raw)
    .filter((s) => s.type === "markdown")
    .map((s) => s.content)
    .join(" ");

  return prose
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/:[a-z][a-z0-9_-]*\[[^\]]*\](?:\{[^}]*\})?/gi, " ")
    .replace(/^\s*[-+*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_~#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Synthesize and play `rawText` aloud. Returns a stop function the caller
 * can invoke to cancel — the same effect as calling stopSpeaking().
 */
export function speak(rawText: string, handlers: SpeakHandlers = {}): () => void {
  stopActive();

  const text = toSpeakableText(rawText);
  if (!text) {
    handlers.onEnd?.();
    return () => {};
  }

  const controller = new AbortController();
  const session: Session = { audio: null, controller, handlers };
  active = session;

  void (async () => {
    try {
      const res = await fetch(`${resolveVoiceServerUrl()}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Voice server returned ${res.status}`);
      const blob = await res.blob();
      if (active !== session) return; // stopped/superseded while fetching

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      session.audio = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (active === session) {
          active = null;
          handlers.onEnd?.();
        }
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (active === session) {
          active = null;
          handlers.onError?.(new Error("Audio playback failed"));
        }
      };
      await audio.play();
      if (active === session) handlers.onStart?.();
    } catch (err) {
      if (active === session) active = null;
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        handlers.onError?.(err);
      }
    }
  })();

  return () => {
    if (active === session) stopActive();
  };
}
