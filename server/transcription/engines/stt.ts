import fs from "node:fs";
import type { PlainSttResult, WhisperVerboseResult } from "../../../shared/transcription/formats/toDetail.js";

const VOICE_SERVER_URL = process.env.VOICE_SERVER_URL ?? "http://localhost:4630";

export interface SttEngineResult {
  engine: string;
  format: "plain" | "whisper_verbose";
  plain?: PlainSttResult;
  whisperVerbose?: WhisperVerboseResult;
}

let voiceSttCached: boolean | null = null;
let voiceSttCheckedAt = 0;

async function voiceServerSupportsStt(): Promise<boolean> {
  const now = Date.now();
  if (voiceSttCached !== null && now - voiceSttCheckedAt < 30_000) return voiceSttCached;
  try {
    const res = await fetch(`${VOICE_SERVER_URL}/openapi.json`, { signal: AbortSignal.timeout(2_000) });
    if (!res.ok) {
      voiceSttCached = false;
    } else {
      const spec = (await res.json()) as { paths?: Record<string, unknown> };
      voiceSttCached = Boolean(spec.paths?.["/api/stt"]);
    }
  } catch {
    voiceSttCached = false;
  }
  voiceSttCheckedAt = now;
  return voiceSttCached;
}

type VoiceServerSttPayload = {
  text?: string;
  language?: string;
  segments?: WhisperVerboseResult["segments"];
};

async function transcribeVoiceServer(wavPath: string): Promise<SttEngineResult> {
  const wavBytes = fs.readFileSync(wavPath);
  const body = new FormData();
  body.append("file", new Blob([wavBytes], { type: "audio/wav" }), "audio.wav");
  const response = await fetch(`${VOICE_SERVER_URL}/api/stt`, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(600_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Voice server STT failed (${response.status})`);
  }
  const payload = (await response.json()) as VoiceServerSttPayload;
  const text = payload.text?.trim();
  if (!text) throw new Error("Voice server returned empty transcript");

  if (payload.segments?.length) {
    return {
      engine: "voice-server",
      format: "whisper_verbose",
      whisperVerbose: {
        text,
        language: payload.language,
        segments: payload.segments,
      },
    };
  }

  return {
    engine: "voice-server",
    format: "plain",
    plain: { text },
  };
}

export async function runStt(wavPath: string): Promise<SttEngineResult> {
  if (!(await voiceServerSupportsStt())) {
    throw new Error(
      "Voice server STT is not available. Start the free local engine with: npm run voice (whisper-mlx on Apple Silicon, or faster-whisper elsewhere).",
    );
  }

  return transcribeVoiceServer(wavPath);
}

export async function listEngines(): Promise<{ id: string; available: boolean; capabilities: string[] }[]> {
  const hasVoice = await voiceServerSupportsStt();
  return [
    {
      id: "voice-server",
      available: hasVoice,
      capabilities: hasVoice ? ["segment_timestamps", "plain"] : [],
    },
  ];
}
