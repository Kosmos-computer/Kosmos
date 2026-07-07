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
  | "settings"
  | "editor";

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
  id: string;
  label: string;
  value: number;
  trend: number;
  status: import("@shared/transcription/types").TranscriptJobStatus | "connected";
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

export function filterTranscripts(
  transcripts: import("@shared/transcription/types").TranscriptSummary[],
  options: {
    status?: import("@shared/transcription/types").TranscriptJobStatus | "all";
    sourceType?: import("@shared/transcription/types").TranscriptSourceType | "all";
    query?: string;
  } = {},
): import("@shared/transcription/types").TranscriptSummary[] {
  const normalizedQuery = options.query?.trim().toLowerCase() ?? "";

  return transcripts.filter((transcript) => {
    if (options.status && options.status !== "all" && transcript.status !== options.status) return false;
    if (options.sourceType && options.sourceType !== "all" && transcript.sourceType !== options.sourceType) {
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
