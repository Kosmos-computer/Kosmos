import type {
  ArtifactKind,
  GeneratedArtifact,
  TimelineChapter,
  TranscriptDetail,
  TranscriptSegment,
} from "../../shared/transcription/types.js";
import OpenAI from "openai";
import { loadSettings } from "../env.js";

const CHAPTER_COLORS = [
  "var(--arco-longformer-chapter-1)",
  "var(--arco-longformer-chapter-2)",
  "var(--arco-longformer-chapter-3)",
  "var(--arco-longformer-chapter-4)",
];

/** Heuristic chapters: split transcript into ~3–5 minute blocks by segment boundaries. */
export function generateHeuristicChapters(detail: TranscriptDetail, targetMs = 180_000): TimelineChapter[] {
  if (detail.segments.length === 0) return [];
  const chapters: TimelineChapter[] = [];
  let chapterStart = detail.segments[0]!.startMs;
  let labelIndex = 1;

  for (let i = 0; i < detail.segments.length; i++) {
    const seg = detail.segments[i]!;
    const next = detail.segments[i + 1];
    const span = seg.endMs - chapterStart;
    const isLast = !next;
    if (span >= targetMs || isLast) {
      const endMs = isLast ? detail.durationMs : next!.startMs;
      const snippet = detail.segments
        .filter((s) => s.startMs >= chapterStart && s.startMs < endMs)
        .map((s) => s.text)
        .join(" ")
        .slice(0, 60);
      chapters.push({
        id: `ch-${labelIndex}`,
        label: snippet ? `${snippet}…` : `Chapter ${labelIndex}`,
        startMs: chapterStart,
        endMs,
        color: CHAPTER_COLORS[(labelIndex - 1) % CHAPTER_COLORS.length]!,
      });
      chapterStart = endMs;
      labelIndex += 1;
    }
  }

  if (chapters.length === 0) {
    chapters.push({
      id: "ch-1",
      label: "Full transcript",
      startMs: 0,
      endMs: detail.durationMs,
      color: CHAPTER_COLORS[0]!,
    });
  }
  return chapters;
}

function artifactFromSegments(kind: ArtifactKind, detail: TranscriptDetail): GeneratedArtifact {
  const now = new Date().toLocaleString();
  const base = { id: `art-${Date.now()}`, createdAt: now, status: "ready" as const };

  switch (kind) {
    case "chapters":
      return {
        ...base,
        kind,
        title: "Chapter markers",
        content: detail.chapters
          .map((ch, i) => `${i + 1}. ${ch.label} (${formatChapterTime(ch.startMs)})`)
          .join("\n"),
      };
    case "clips":
      return {
        ...base,
        kind,
        title: "Suggested clips",
        content:
          detail.tracks
            .find((t) => t.kind === "words")
            ?.clips.map((c) => `• ${c.label} (${Math.round((c.endMs - c.startMs) / 1000)}s)`)
            .join("\n") ?? "No clips generated.",
      };
    case "summaries":
      return {
        ...base,
        kind,
        title: "Episode summary",
        content: summarizeLocally(detail.segments),
      };
    case "quotes":
      return {
        ...base,
        kind,
        title: "Pull quotes",
        content: detail.segments
          .filter((s) => s.text.length > 40)
          .slice(0, 3)
          .map((s) => `"${s.text.slice(0, 100)}${s.text.length > 100 ? "…" : ""}"`)
          .join("\n"),
      };
    case "titles":
      return {
        ...base,
        kind,
        title: "Title options",
        content: [
          detail.title,
          `${detail.title} — key takeaways`,
          `Highlights from ${detail.title}`,
        ].join("\n"),
      };
    case "notes":
      return {
        ...base,
        kind,
        title: "Editor notes",
        content: `Project: ${detail.projectName}\nSpeakers: ${detail.speakers.map((s) => s.name).join(", ")}\nWords: ${countWords(detail.segments)}`,
        status: "draft",
      };
    case "reels":
      return {
        ...base,
        kind,
        title: "Short-form reel script",
        content: `HOOK: ${detail.segments[0]?.text.slice(0, 80) ?? detail.title}\n\nBODY: ${summarizeLocally(detail.segments, 200)}\n\nCTA: Full transcript in Longformer.`,
        status: "draft",
      };
    default:
      return { ...base, kind, title: kind, content: "" };
  }
}

function formatChapterTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function countWords(segments: TranscriptSegment[]): number {
  return segments
    .map((s) => s.text)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function summarizeLocally(segments: TranscriptSegment[], max = 280): string {
  const text = segments
    .slice(0, 6)
    .map((s) => s.text)
    .join(" ")
    .trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

async function summarizeWithLlm(detail: TranscriptDetail): Promise<string> {
  const settings = loadSettings();
  const apiKey = settings.apiKey?.trim();
  if (!apiKey || settings.provider === "mock") return summarizeLocally(detail.segments, 500);

  const client = new OpenAI({ apiKey, baseURL: settings.baseUrl });
  const excerpt = detail.segments
    .slice(0, 12)
    .map((s) => s.text)
    .join(" ")
    .slice(0, 6000);

  const completion = await client.chat.completions.create({
    model: settings.model,
    messages: [
      {
        role: "system",
        content: "Summarize the transcript excerpt in 2–3 concise paragraphs for show notes.",
      },
      { role: "user", content: excerpt },
    ],
    max_tokens: 600,
  });

  return completion.choices[0]?.message?.content?.trim() || summarizeLocally(detail.segments, 500);
}

export async function enrichTranscript(detail: TranscriptDetail): Promise<TranscriptDetail> {
  const chapters = generateHeuristicChapters(detail);
  const withChapters = { ...detail, chapters };

  let summaryText = summarizeLocally(withChapters.segments, 500);
  try {
    summaryText = await summarizeWithLlm(withChapters);
  } catch {
    // fall back to local summary
  }

  const artifacts: GeneratedArtifact[] = [
    {
      id: `art-chapters-${Date.now()}`,
      kind: "chapters",
      title: "Chapter markers",
      content: chapters.map((ch, i) => `${i + 1}. ${ch.label}`).join("\n"),
      createdAt: new Date().toLocaleString(),
      status: "ready",
    },
    {
      id: `art-summary-${Date.now()}`,
      kind: "summaries",
      title: "Episode summary",
      content: summaryText,
      createdAt: new Date().toLocaleString(),
      status: "ready",
    },
    artifactFromSegments("quotes", { ...withChapters, chapters }),
    artifactFromSegments("clips", { ...withChapters, chapters }),
    artifactFromSegments("titles", { ...withChapters, chapters }),
  ];

  return { ...withChapters, artifacts };
}

export function generateArtifact(kind: ArtifactKind, detail: TranscriptDetail): GeneratedArtifact {
  return artifactFromSegments(kind, detail);
}
