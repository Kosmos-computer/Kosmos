/** Longformer — transcription workspace domain types. */

export type LongformerView =
  | "library"
  | "editor"
  | "in-progress"
  | "sources"
  | "uploads"
  | "settings";

export type TranscriptSourceType = "call" | "meeting" | "podcast" | "upload" | "recording" | "memory";
export type TranscriptStatus = "queued" | "processing" | "ready" | "failed";

export type ArtifactKind =
  | "chapters"
  | "clips"
  | "reels"
  | "titles"
  | "notes"
  | "summaries"
  | "quotes";

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
  status: TranscriptStatus | "connected";
}

export interface TranscriptSummary {
  id: string;
  title: string;
  sourceType: TranscriptSourceType;
  sourceLabel: string;
  status: TranscriptStatus;
  durationMs: number;
  wordCount?: number;
  speakerCount?: number;
  createdAt: string;
  createdAtMs: number;
  excerpt?: string;
  language?: string;
  projectName?: string;
  pinned?: boolean;
}

export interface MediaFile {
  id: string;
  name: string;
  kind: "audio" | "video" | "image";
  extension: string;
  durationMs?: number;
}

export interface Speaker {
  id: string;
  name: string;
  color: string;
}

export interface TranscriptWord {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  speakerId: string;
  /** Highlighted filler word, emphasis, etc. */
  highlight?: "filler" | "emphasis" | "edited";
}

export interface TranscriptSegment {
  id: string;
  speakerId: string;
  startMs: number;
  endMs: number;
  text: string;
  words: TranscriptWord[];
}

export interface TimelineChapter {
  id: string;
  label: string;
  startMs: number;
  endMs: number;
  color: string;
}

export interface TimelineClip {
  id: string;
  label: string;
  startMs: number;
  endMs: number;
  trackId: string;
}

export interface TimelineTrack {
  id: string;
  label: string;
  kind: "chapters" | "words" | "waveform";
  clips: TimelineClip[];
}

export interface GeneratedArtifact {
  id: string;
  kind: ArtifactKind;
  title: string;
  content: string;
  createdAt: string;
  status: "draft" | "ready";
}

export interface TranscriptDetail {
  id: string;
  title: string;
  projectName: string;
  status: TranscriptStatus;
  durationMs: number;
  currentMs: number;
  language: string;
  speakers: Speaker[];
  segments: TranscriptSegment[];
  chapters: TimelineChapter[];
  tracks: TimelineTrack[];
  mediaFiles: MediaFile[];
  artifacts: GeneratedArtifact[];
  /** Clip inspector state */
  selectedClipId: string | null;
  volumeDb: number;
  speed: number;
  compressorEnabled: boolean;
  compressorPreset: string;
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
  transcripts: TranscriptSummary[];
  /** Full editor payload keyed by transcript id */
  details: Record<string, TranscriptDetail>;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  if (minutes > 0 || seconds >= 10) {
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return `${seconds}.${tenths}`;
}

export function formatTimecode(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

export function filterTranscripts(
  transcripts: TranscriptSummary[],
  options: {
    status?: TranscriptStatus | "all";
    sourceType?: TranscriptSourceType | "all";
    query?: string;
  } = {},
): TranscriptSummary[] {
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
