import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { dataDirs } from "../env.js";
import { resolveLocalEpisode } from "./podcastSeedService.js";
import { resolveRssEpisode, type RssEpisodeRecord } from "./podcastRssService.js";

const execFileAsync = promisify(execFile);

const TRANSCRIPTS_DIR = path.join(dataDirs.root, "podcast-transcripts");
const MANIFEST_FILE = path.join(TRANSCRIPTS_DIR, "manifest.json");
const VOICE_SERVER_URL = process.env.VOICE_SERVER_URL ?? "http://localhost:4630";
/** Local STT upload limit — longer episodes are split with ffmpeg. */
const WHISPER_MAX_BYTES = 25 * 1024 * 1024;
const CHUNK_TARGET_BYTES = 20 * 1024 * 1024;

export type PodcastTranscriptEngine = "voice-server";

export interface PodcastTranscriptSummary {
  episodeId: string;
  title: string;
  showTitle: string;
  engine: PodcastTranscriptEngine;
  wordCount: number;
  createdAt: string;
  textPreview: string;
}

export interface PodcastTranscriptRecord extends PodcastTranscriptSummary {
  text: string;
}

interface TranscriptManifest {
  records: PodcastTranscriptSummary[];
}

function ensureTranscriptsDir(): void {
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}

function transcriptJsonPath(episodeId: string): string {
  return path.join(TRANSCRIPTS_DIR, `${episodeId}.json`);
}

function transcriptTxtPath(episodeId: string): string {
  return path.join(TRANSCRIPTS_DIR, `${episodeId}.txt`);
}

function loadManifest(): TranscriptManifest {
  try {
    const parsed = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf-8")) as Partial<TranscriptManifest>;
    if (parsed.records) return { records: parsed.records };
  } catch {
    // Fresh manifest.
  }
  return { records: [] };
}

function saveManifest(manifest: TranscriptManifest): void {
  ensureTranscriptsDir();
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf-8");
}

function previewText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 240) return trimmed;
  return `${trimmed.slice(0, 237)}…`;
}

let voiceServerSttAvailable: boolean | null = null;
let voiceServerSttCheckedAt = 0;
const VOICE_SERVER_STT_CACHE_MS = 30_000;

async function voiceServerSupportsStt(): Promise<boolean> {
  const now = Date.now();
  if (voiceServerSttAvailable !== null && now - voiceServerSttCheckedAt < VOICE_SERVER_STT_CACHE_MS) {
    return voiceServerSttAvailable;
  }

  try {
    const res = await fetch(`${VOICE_SERVER_URL}/openapi.json`, { signal: AbortSignal.timeout(2_000) });
    if (!res.ok) {
      voiceServerSttAvailable = false;
      voiceServerSttCheckedAt = now;
      return false;
    }
    const spec = (await res.json()) as { paths?: Record<string, unknown> };
    voiceServerSttAvailable = Boolean(spec.paths?.["/api/stt"]);
  } catch {
    voiceServerSttAvailable = false;
  }
  voiceServerSttCheckedAt = now;
  return voiceServerSttAvailable;
}

async function fetchRssAudio(episode: RssEpisodeRecord): Promise<{ data: Buffer; ext: string }> {
  const response = await fetch(episode.enclosureUrl, {
    headers: {
      Accept: "audio/*,*/*",
      "User-Agent": "Arco-Podcasts/1.0",
    },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const data = Buffer.from(await response.arrayBuffer());
  let ext = ".mp3";
  try {
    ext = path.extname(new URL(episode.enclosureUrl).pathname).toLowerCase() || ".mp3";
  } catch {
    // Keep default.
  }
  return { data, ext };
}

async function resolveEpisodeAudio(
  episodeId: string,
): Promise<{ title: string; showTitle: string; data: Buffer; ext: string }> {
  if (episodeId.startsWith("rss-")) {
    let episode = resolveRssEpisode(episodeId);
    if (!episode) {
      const { listRssEpisodes } = await import("./podcastRssService.js");
      await listRssEpisodes();
      episode = resolveRssEpisode(episodeId);
    }
    if (!episode) throw new Error("Episode not found");
    const fetched = await fetchRssAudio(episode);
    return {
      title: episode.title,
      showTitle: episode.showTitle,
      data: fetched.data,
      ext: fetched.ext,
    };
  }

  const resolved = resolveLocalEpisode(episodeId);
  if (!resolved) throw new Error("Episode not found");
  const data = fs.readFileSync(resolved.absPath);
  const ext = path.extname(resolved.absPath).toLowerCase() || ".mp3";
  return {
    title: resolved.episode.title,
    showTitle: resolved.episode.showTitle,
    data,
    ext,
  };
}

async function probeDurationSec(inputPath: string): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    inputPath,
  ]);
  const value = Number.parseFloat(stdout.trim());
  return Number.isFinite(value) && value > 0 ? value : 0;
}

async function extractWavSegment(
  inputPath: string,
  outputPath: string,
  startSec: number,
  durationSec: number,
): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    String(startSec),
    "-t",
    String(durationSec),
    "-i",
    inputPath,
    "-ar",
    "16000",
    "-ac",
    "1",
    "-y",
    outputPath,
  ]);
}

async function convertToWav16k(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-ar",
    "16000",
    "-ac",
    "1",
    "-y",
    outputPath,
  ]);
}

async function transcribeWithVoiceServer(audio: Buffer, ext: string): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arco-podcast-stt-"));
  const inputPath = path.join(tmpDir, `audio${ext}`);
  const wavPath = path.join(tmpDir, "audio.wav");

  try {
    fs.writeFileSync(inputPath, audio);
    if (ext === ".wav") {
      fs.copyFileSync(inputPath, wavPath);
    } else {
      await convertToWav16k(inputPath, wavPath);
    }
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
      throw new Error(
        detail.includes("Not Found")
          ? "Voice server is missing /api/stt — restart it with npm run voice"
          : `Voice server returned ${response.status}`,
      );
    }
    const payload = (await response.json()) as { text?: string };
    const text = payload.text?.trim();
    if (!text) throw new Error("Voice server returned an empty transcript");
    return text;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function transcribeAudioSegment(
  audio: Buffer,
  ext: string,
  _title: string,
): Promise<{ text: string; engine: PodcastTranscriptEngine }> {
  if (!(await voiceServerSupportsStt())) {
    throw new Error(
      "Voice server STT is not available. Start the free local engine with: npm run voice (whisper-mlx on Apple Silicon, or faster-whisper elsewhere).",
    );
  }

  const text = await transcribeWithVoiceServer(audio, ext);
  return { text, engine: "voice-server" };
}

async function generateTranscript(
  audio: Buffer,
  ext: string,
  title: string,
): Promise<{ text: string; engine: PodcastTranscriptEngine }> {
  if (audio.length <= WHISPER_MAX_BYTES) {
    return transcribeAudioSegment(audio, ext, title);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arco-podcast-tx-"));
  const inputPath = path.join(tmpDir, `source${ext || ".mp3"}`);

  try {
    fs.writeFileSync(inputPath, audio);
    const durationSec = await probeDurationSec(inputPath);
    const bytesPerSec = durationSec > 0 ? audio.length / durationSec : audio.length;
    const segmentSec =
      durationSec > 0
        ? Math.max(60, Math.min(durationSec, Math.floor(CHUNK_TARGET_BYTES / bytesPerSec)))
        : 60;
    const segmentCount = durationSec > 0 ? Math.max(1, Math.ceil(durationSec / segmentSec)) : 1;

    const parts: string[] = [];
    let engine: PodcastTranscriptEngine | null = null;

    for (let i = 0; i < segmentCount; i++) {
      const startSec = i * segmentSec;
      const thisDuration = durationSec > 0 ? Math.min(segmentSec, durationSec - startSec) : segmentSec;
      const wavPath = path.join(tmpDir, `segment-${i}.wav`);
      await extractWavSegment(inputPath, wavPath, startSec, thisDuration);
      const segmentAudio = fs.readFileSync(wavPath);
      const segmentTitle = segmentCount > 1 ? `${title} (${i + 1}/${segmentCount})` : title;
      const result = await transcribeAudioSegment(segmentAudio, ".wav", segmentTitle);
      parts.push(result.text);
      engine = engine ?? result.engine;
    }

    return { text: parts.join("\n\n"), engine: engine ?? "voice-server" };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function persistTranscript(record: PodcastTranscriptRecord): void {
  ensureTranscriptsDir();
  fs.writeFileSync(transcriptJsonPath(record.episodeId), JSON.stringify(record, null, 2), "utf-8");
  fs.writeFileSync(transcriptTxtPath(record.episodeId), record.text, "utf-8");

  const manifest = loadManifest();
  const summary: PodcastTranscriptSummary = {
    episodeId: record.episodeId,
    title: record.title,
    showTitle: record.showTitle,
    engine: record.engine,
    wordCount: record.wordCount,
    createdAt: record.createdAt,
    textPreview: record.textPreview,
  };
  manifest.records = manifest.records.filter((entry) => entry.episodeId !== record.episodeId);
  manifest.records.unshift(summary);
  saveManifest(manifest);
}

export function listPodcastTranscripts(): PodcastTranscriptSummary[] {
  return loadManifest().records;
}

export function getPodcastTranscript(episodeId: string): PodcastTranscriptRecord | undefined {
  const jsonPath = transcriptJsonPath(episodeId);
  if (!fs.existsSync(jsonPath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as PodcastTranscriptRecord;
  } catch {
    return undefined;
  }
}

export async function transcribePodcastEpisode(episodeId: string): Promise<PodcastTranscriptRecord> {
  const existing = getPodcastTranscript(episodeId);
  if (existing) return existing;

  const { title, showTitle, data, ext } = await resolveEpisodeAudio(episodeId);
  const { text, engine } = await generateTranscript(data, ext, title);
  const record: PodcastTranscriptRecord = {
    episodeId,
    title,
    showTitle,
    engine,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    createdAt: new Date().toISOString(),
    textPreview: previewText(text),
    text,
  };

  persistTranscript(record);
  return record;
}
