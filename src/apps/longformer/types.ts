/** Longformer — transcription workspace domain types. */

export type {
  ArtifactKind,
  GeneratedArtifact,
  MediaFile,
  Speaker,
  TimelineChapter,
  TimelineClip,
  TimelineTrack,
  TranscriptDetail,
  TranscriptJobStatus,
  TranscriptSegment,
  TranscriptSourceType,
  TranscriptSummary,
  TranscriptWord,
} from "@shared/transcription/types";

/** UI alias — same as TranscriptJobStatus. */
export type TranscriptStatus = import("@shared/transcription/types").TranscriptJobStatus;

export { formatDuration, formatTimecode } from "@shared/transcription/types";

export type LongformerView =
  | "library"
  | "in-progress"
  | "sources"
  | "uploads"
  | "settings";

/** In-job asset page — mirrors Podium job sidenav (state-based, not URL routes). */
export type LongformerJobView =
  | "status"
  | "transcript"
  | "chapters"
  | "clips"
  | "titles"
  | "summaries"
  | "quotes"
  | "notes"
  | "reels"
  | "details";

export type { TranscriptionJob } from "@shared/transcription/types";
export type { TranscriptionStep, StepState } from "@shared/transcription/steps";

export interface LongformerNavItem {
  id: string;
  label: string;
  view: LongformerView;
  badge?: string;
}

export interface ConnectedSource {
  id: string;
  label: string;
  provider: string;
  status: "connected" | "syncing" | "disconnected";
  lastSync?: string;
}

export interface TranscriptMetric {
  id: "total" | "ready" | "processing" | "queued" | "sources";
  label: string;
  value: number;
  /** Optional period-over-period change; omit when unknown. */
  trend?: number;
  status: import("@shared/transcription/types").TranscriptJobStatus | "connected" | "all";
}

/** Derive library KPI cards from live jobs + connected sources. */
export function buildLibraryMetrics(
  transcripts: import("@shared/transcription/types").TranscriptSummary[],
  connectedSources: ConnectedSource[],
): TranscriptMetric[] {
  const ready = transcripts.filter((t) => t.status === "ready").length;
  const processing = transcripts.filter((t) => t.status === "processing").length;
  const queued = transcripts.filter((t) => t.status === "queued").length;
  const sources = connectedSources.filter((s) => s.status === "connected" || s.status === "syncing").length;

  return [
    { id: "total", label: "Total Transcripts", value: transcripts.length, status: "all" },
    { id: "ready", label: "Ready", value: ready, status: "ready" },
    { id: "processing", label: "Processing", value: processing, status: "processing" },
    { id: "queued", label: "Queued", value: queued, status: "queued" },
    { id: "sources", label: "Connected Sources", value: sources, status: "connected" },
  ];
}

export interface LongformerWorkspaceData {
  productName: string;
  userName: string;
  userEmail: string;
  navItems: LongformerNavItem[];
  connectedSources: ConnectedSource[];
  pinnedTranscripts: { id: string; label: string; meta?: string }[];
  metrics: TranscriptMetric[];
  processingCount: number;
  transcripts: import("@shared/transcription/types").TranscriptSummary[];
  details: Record<string, import("@shared/transcription/types").TranscriptDetail>;
}

export type TranscriptDateRange = "7d" | "30d" | "90d" | "all";

const DATE_RANGE_MS: Record<Exclude<TranscriptDateRange, "all">, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

export function filterTranscripts(
  transcripts: import("@shared/transcription/types").TranscriptSummary[],
  options: {
    status?: import("@shared/transcription/types").TranscriptJobStatus | "all";
    sourceType?: import("@shared/transcription/types").TranscriptSourceType | "all";
    dateRange?: TranscriptDateRange;
    language?: string | "all";
    query?: string;
    nowMs?: number;
  } = {},
): import("@shared/transcription/types").TranscriptSummary[] {
  const normalizedQuery = options.query?.trim().toLowerCase() ?? "";
  const nowMs = options.nowMs ?? Date.now();
  const dateCutoffMs =
    options.dateRange && options.dateRange !== "all" ? nowMs - DATE_RANGE_MS[options.dateRange] : null;

  return transcripts.filter((transcript) => {
    if (options.status && options.status !== "all" && transcript.status !== options.status) return false;
    if (options.sourceType && options.sourceType !== "all" && transcript.sourceType !== options.sourceType) {
      return false;
    }
    if (dateCutoffMs != null && transcript.createdAtMs < dateCutoffMs) return false;
    if (options.language && options.language !== "all" && transcript.language !== options.language) {
      return false;
    }
    if (!normalizedQuery) return true;
    return (
      transcript.title.toLowerCase().includes(normalizedQuery) ||
      transcript.sourceLabel.toLowerCase().includes(normalizedQuery) ||
      (transcript.excerpt?.toLowerCase().includes(normalizedQuery) ?? false) ||
      (transcript.projectName?.toLowerCase().includes(normalizedQuery) ?? false)
    );
  });
}
