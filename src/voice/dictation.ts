/**
 * Note dictation — lightweight speech-to-text for inserting prose into editors.
 * Prefers the browser Web Speech API for live partial results; falls back to
 * recording audio and POSTing WAV to the voice server's /api/stt (Whisper).
 */
import { blobToWav16k } from "./audioToWav";
import { resolveVoiceServerUrl } from "./VoiceClient";

export type DictationStatus = "idle" | "listening" | "processing";

export interface DictationHandlers {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onStatus?: (status: DictationStatus) => void;
  onError?: (message: string) => void;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function dictationEngine(): "webspeech" | "server" | null {
  if (getSpeechRecognition()) return "webspeech";
  if (typeof navigator !== "undefined" && navigator.mediaDevices) return "server";
  return null;
}

export function isDictationSupported(): boolean {
  return dictationEngine() !== null;
}

export async function startDictation(handlers: DictationHandlers): Promise<() => void> {
  const Recognition = getSpeechRecognition();
  if (Recognition) return startWebSpeech(Recognition, handlers);
  return startServerDictation(handlers);
}

function startWebSpeech(Recognition: SpeechRecognitionCtor, handlers: DictationHandlers): () => void {
  const recognition = new Recognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-US";

  let stopping = false;

  recognition.onresult = (event) => {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const chunk = result[0]?.transcript ?? "";
      if (result.isFinal) final += chunk;
      else interim += chunk;
    }
    if (interim.trim()) handlers.onInterim?.(interim.trim());
    if (final.trim()) {
      handlers.onInterim?.("");
      handlers.onFinal?.(final.trim());
    }
  };

  recognition.onerror = (event) => {
    if (stopping) return;
    const code = (event as Event & { error?: string }).error;
    if (code === "aborted" || code === "no-speech") return;
    handlers.onError?.(code === "not-allowed" ? "Microphone permission denied." : `Dictation error: ${code ?? "unknown"}`);
    handlers.onStatus?.("idle");
  };

  recognition.onend = () => {
    if (!stopping) {
      try {
        recognition.start();
      } catch {
        handlers.onStatus?.("idle");
      }
    }
  };

  try {
    recognition.start();
    handlers.onStatus?.("listening");
  } catch {
    handlers.onError?.("Could not start dictation.");
    handlers.onStatus?.("idle");
  }

  return () => {
    stopping = true;
    recognition.onend = null;
    recognition.stop();
    handlers.onInterim?.("");
    handlers.onStatus?.("idle");
  };
}

async function startServerDictation(handlers: DictationHandlers): Promise<() => void> {
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  const chunks: Blob[] = [];
  let stopped = false;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.start();
    handlers.onStatus?.("listening");
  } catch {
    handlers.onError?.("Microphone permission denied.");
    handlers.onStatus?.("idle");
    return () => {};
  }

  const stop = () => {
    if (stopped) return;
    stopped = true;
    handlers.onStatus?.("processing");

    const finalize = async () => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;

      if (chunks.length === 0) {
        handlers.onStatus?.("idle");
        return;
      }

      try {
        const wav = await blobToWav16k(new Blob(chunks, { type: recorder?.mimeType || "audio/webm" }));
        const body = new FormData();
        body.append("file", wav, "dictation.wav");
        const res = await fetch(`${resolveVoiceServerUrl()}/api/stt`, { method: "POST", body });
        if (!res.ok) throw new Error(`Voice server returned ${res.status}`);
        const payload = (await res.json()) as { text?: string };
        const text = payload.text?.trim();
        if (text) handlers.onFinal?.(text);
      } catch (err) {
        handlers.onError?.(
          err instanceof Error ? err.message : "Transcription failed — is the voice server running? (npm run voice)",
        );
      } finally {
        handlers.onInterim?.("");
        handlers.onStatus?.("idle");
      }
    };

    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => void finalize();
      recorder.stop();
    } else {
      void finalize();
    }
  };

  return stop;
}
