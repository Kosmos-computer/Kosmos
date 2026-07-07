import type {
  GeneratedArtifact,
  MediaFile,
  Speaker,
  TimelineChapter,
  TimelineClip,
  TimelineTrack,
  TranscriptDetail,
  TranscriptJobStatus,
  TranscriptSegment,
  TranscriptWord,
} from "../types.js";
import { elementEndMs, elementStartMs, type RevTranscript } from "./rev.js";

const SPEAKER_COLORS = [
  "var(--arco-longformer-speaker-julian)",
  "var(--arco-longformer-speaker-hunter)",
  "var(--arco-longformer-speaker-3)",
  "var(--arco-longformer-speaker-4)",
];

export interface PlainSttResult {
  text: string;
  language?: string;
}

export interface WhisperVerboseSegment {
  start: number;
  end: number;
  text: string;
  words?: { word: string; start: number; end: number }[];
}

export interface WhisperVerboseResult {
  text: string;
  language?: string;
  segments?: WhisperVerboseSegment[];
}

function speakerIdForIndex(index: number): string {
  return `speaker-${index + 1}`;
}

function buildSpeakersFromRev(transcript: RevTranscript): Speaker[] {
  const seen = new Map<string, number>();
  for (const mono of transcript.monologues) {
    const key = String(mono.speaker_id ?? mono.speaker ?? 1);
    if (!seen.has(key)) seen.set(key, seen.size);
  }
  return [...seen.entries()].map(([key, idx]) => ({
    id: speakerIdForIndex(idx),
    name: `Speaker ${key}`,
    color: SPEAKER_COLORS[idx % SPEAKER_COLORS.length]!,
  }));
}

function revSpeakerKey(mono: RevTranscript["monologues"][number]): string {
  return String(mono.speaker_id ?? mono.speaker ?? 1);
}

export function revToSegments(transcript: RevTranscript, speakers: Speaker[]): TranscriptSegment[] {
  const speakerIndex = new Map<string, string>();
  const uniqueKeys = [...new Set(transcript.monologues.map(revSpeakerKey))];
  uniqueKeys.forEach((key, i) => speakerIndex.set(key, speakers[i]?.id ?? speakerIdForIndex(i)));

  const segments: TranscriptSegment[] = [];

  transcript.monologues.forEach((mono, monoIdx) => {
    const speakerId = speakerIndex.get(revSpeakerKey(mono)) ?? speakerIdForIndex(0);
    const words: TranscriptWord[] = [];
    const textParts: string[] = [];
    let segStart = 0;
    let segEnd = 0;

    mono.elements.forEach((el, elIdx) => {
      if (el.type !== "text") {
        if (el.type === "punct" && el.value.trim()) textParts.push(el.value);
        return;
      }
      const startMs = elementStartMs(el);
      const endMs = elementEndMs(el, startMs);
      if (words.length === 0) segStart = startMs;
      segEnd = endMs;
      textParts.push(el.value);
      words.push({
        id: `w-${monoIdx}-${elIdx}`,
        text: el.value,
        startMs,
        endMs,
        speakerId,
      });
    });

    const text = textParts.join(" ").replace(/\s+/g, " ").trim();
    if (!text) return;

    segments.push({
      id: `seg-${monoIdx}`,
      speakerId,
      startMs: segStart,
      endMs: segEnd || segStart + 1000,
      text,
      words,
    });
  });

  return segments;
}

export function plainToSegments(text: string, durationMs: number): TranscriptSegment[] {
  const speakerId = speakerIdForIndex(0);
  const trimmed = text.trim();
  if (!trimmed) return [];
  return [
    {
      id: "seg-0",
      speakerId,
      startMs: 0,
      endMs: durationMs,
      text: trimmed,
      words: [],
    },
  ];
}

export function whisperVerboseToSegments(result: WhisperVerboseResult): TranscriptSegment[] {
  const speakerId = speakerIdForIndex(0);
  const segments: TranscriptSegment[] = [];

  for (const [i, seg] of (result.segments ?? []).entries()) {
    const startMs = Math.round(seg.start * 1000);
    const endMs = Math.round(seg.end * 1000);
    const words: TranscriptWord[] = (seg.words ?? []).map((w, wi) => ({
      id: `w-${i}-${wi}`,
      text: w.word.trim(),
      startMs: Math.round(w.start * 1000),
      endMs: Math.round(w.end * 1000),
      speakerId,
    }));
    segments.push({
      id: `seg-${i}`,
      speakerId,
      startMs,
      endMs,
      text: seg.text.trim(),
      words,
    });
  }

  if (segments.length === 0 && result.text.trim()) {
    return plainToSegments(result.text, 0);
  }
  return segments;
}

export function buildTranscriptDetail(opts: {
  id: string;
  title: string;
  projectName?: string;
  status: TranscriptJobStatus;
  durationMs: number;
  language?: string;
  segments: TranscriptSegment[];
  speakers?: Speaker[];
  chapters?: TimelineChapter[];
  artifacts?: GeneratedArtifact[];
  mediaFiles?: MediaFile[];
}): TranscriptDetail {
  const speakers =
    opts.speakers ??
    (opts.segments.length > 0
      ? [
          {
            id: opts.segments[0]!.speakerId,
            name: "Speaker 1",
            color: SPEAKER_COLORS[0]!,
          },
        ]
      : [{ id: speakerIdForIndex(0), name: "Speaker 1", color: SPEAKER_COLORS[0]! }]);

  const durationMs =
    opts.durationMs ||
    Math.max(...opts.segments.map((s) => s.endMs), 0);

  const clipTrackId = "track-words";
  const clips: TimelineClip[] = opts.segments
    .filter((s) => s.text.length > 40)
    .slice(0, 5)
    .map((s, i) => ({
      id: `clip-suggest-${i}`,
      label: s.text.slice(0, 48) + (s.text.length > 48 ? "…" : ""),
      startMs: s.startMs,
      endMs: s.endMs,
      trackId: clipTrackId,
    }));

  const tracks: TimelineTrack[] = [
    {
      id: "track-wave",
      label: "Audio",
      kind: "waveform",
      clips: [{ id: "clip-full", label: "Full clip", startMs: 0, endMs: durationMs, trackId: "track-wave" }],
    },
    {
      id: clipTrackId,
      label: "Words",
      kind: "words",
      clips,
    },
  ];

  return {
    id: opts.id,
    title: opts.title,
    projectName: opts.projectName ?? "Transcription",
    status: opts.status,
    durationMs,
    currentMs: 0,
    language: opts.language ?? "English",
    speakers,
    segments: opts.segments,
    chapters: opts.chapters ?? [],
    tracks,
    mediaFiles: opts.mediaFiles ?? [],
    artifacts: opts.artifacts ?? [],
    selectedClipId: null,
    volumeDb: 0,
    speed: 1,
    compressorEnabled: false,
    compressorPreset: "Classic Voiceover",
  };
}

export function detailFromRev(
  id: string,
  title: string,
  rev: RevTranscript,
  opts: { status: TranscriptJobStatus; durationMs?: number; projectName?: string; mediaFiles?: MediaFile[] },
): TranscriptDetail {
  const speakers = buildSpeakersFromRev(rev);
  const segments = revToSegments(rev, speakers);
  const durationMs =
    opts.durationMs ?? Math.max(...segments.map((s) => s.endMs), 0);
  return buildTranscriptDetail({
    id,
    title,
    projectName: opts.projectName,
    status: opts.status,
    durationMs,
    language: rev.language?.code ?? "English",
    segments,
    speakers,
    mediaFiles: opts.mediaFiles,
  });
}
