import type { GeneratedArtifact, TimelineClip } from "./types";

/** Split artifact body into display lines (titles, quotes, bullet clips). */
export function linesFromArtifact(artifact: GeneratedArtifact | undefined): string[] {
  if (!artifact?.content.trim()) return [];
  return artifact.content
    .split(/\n+/)
    .map((line) => line.replace(/^[\d]+[.)]\s*/, "").replace(/^•\s*/, "").trim())
    .filter(Boolean);
}

/** Parse clip artifact + timeline tracks into unified clip cards. */
export function collectClipCards(detail: {
  artifacts: GeneratedArtifact[];
  tracks: { kind: string; clips: TimelineClip[] }[];
}): { id: string; label: string; startMs: number; endMs: number; source: "track" | "artifact" }[] {
  const fromTracks = detail.tracks
    .filter((t) => t.kind === "words")
    .flatMap((t) =>
      t.clips
        .filter((c) => c.label !== "Full clip" && c.endMs > c.startMs)
        .map((c) => ({
          id: c.id,
          label: c.label,
          startMs: c.startMs,
          endMs: c.endMs,
          source: "track" as const,
        })),
    );

  if (fromTracks.length > 0) return fromTracks;

  const artifact = detail.artifacts.find((a) => a.kind === "clips");
  return linesFromArtifact(artifact).map((line, i) => ({
    id: `clip-art-${i}`,
    label: line,
    startMs: 0,
    endMs: 0,
    source: "artifact" as const,
  }));
}

export function isPersistableJobId(id: string | null): id is string {
  return !!id && !id.startsWith("tr-");
}

export function mediaUrlForJob(jobId: string | null): string | null {
  return isPersistableJobId(jobId) ? `/api/transcription/jobs/${encodeURIComponent(jobId)}/media` : null;
}
