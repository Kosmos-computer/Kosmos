import type { ArtifactKind, TranscriptDetail, TranscriptionJob } from "./types";
import type { LongformerJobView } from "./types";

export interface LongformerJobNavItem {
  id: LongformerJobView;
  label: string;
  artifactKind?: ArtifactKind;
  /** Pipeline step that must be complete before this page is enabled. */
  requiredStep?: import("@shared/transcription/steps").TranscriptionStep;
}

export const LONGFORMER_JOB_NAV: LongformerJobNavItem[] = [
  { id: "status", label: "Status" },
  { id: "transcript", label: "Transcript", requiredStep: "transcript_persisted" },
  { id: "titles", label: "Titles", artifactKind: "titles", requiredStep: "artifacts_generated" },
  { id: "summaries", label: "Summary", artifactKind: "summaries", requiredStep: "artifacts_generated" },
  { id: "chapters", label: "Chapters", artifactKind: "chapters", requiredStep: "chapters_generated" },
  { id: "clips", label: "Clips", artifactKind: "clips", requiredStep: "artifacts_generated" },
  { id: "quotes", label: "Quotes", artifactKind: "quotes", requiredStep: "artifacts_generated" },
  { id: "notes", label: "Notes", artifactKind: "notes", requiredStep: "artifacts_generated" },
  { id: "reels", label: "Reels", artifactKind: "reels", requiredStep: "artifacts_generated" },
  { id: "details", label: "Details", requiredStep: "transcript_persisted" },
];

const JOB_VIEW_STORAGE_KEY = "arco:longformer:job-view";

export function loadPersistedJobView(jobId: string): LongformerJobView | null {
  try {
    const raw = localStorage.getItem(`${JOB_VIEW_STORAGE_KEY}:${jobId}`);
    if (!raw) return null;
    if (LONGFORMER_JOB_NAV.some((item) => item.id === raw)) return raw as LongformerJobView;
  } catch {
    // Ignore storage errors.
  }
  return null;
}

export function persistJobView(jobId: string, view: LongformerJobView): void {
  try {
    localStorage.setItem(`${JOB_VIEW_STORAGE_KEY}:${jobId}`, view);
  } catch {
    // Ignore storage errors.
  }
}

function stepComplete(job: TranscriptionJob | null, step: import("@shared/transcription/steps").TranscriptionStep): boolean {
  return job?.steps[step]?.status === "complete";
}

export function isJobViewEnabled(
  item: LongformerJobNavItem,
  job: TranscriptionJob | null,
  detail: TranscriptDetail | null,
): boolean {
  if (item.id === "status") return true;
  if (!job && !detail) return false;

  if (item.requiredStep && job) {
    if (stepComplete(job, item.requiredStep)) return true;
  }

  if (detail?.status === "ready") {
    if (item.id === "transcript") return detail.segments.length > 0;
    if (item.id === "chapters") return detail.chapters.length > 0;
    if (item.artifactKind) {
      return detail.artifacts.some((a) => a.kind === item.artifactKind);
    }
    if (item.id === "details") return true;
  }

  if (job?.status === "ready") return item.id === "transcript" || item.id === "details";

  return false;
}

export function defaultJobView(job: TranscriptionJob | null, detail: TranscriptDetail | null): LongformerJobView {
  if (job && (job.status === "queued" || job.status === "processing" || job.status === "failed")) {
    return "status";
  }
  if (detail?.status === "ready" || job?.status === "ready") return "transcript";
  return "status";
}
