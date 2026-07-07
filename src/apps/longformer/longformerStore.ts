import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "../../os/auth/authStore";
import { BEACHCUBE_PODCAST_DETAIL, LONGFORMER_MOCK } from "./longformerMock";
import type {
  ArtifactKind,
  LongformerView,
  TranscriptDetail,
  TranscriptJobStatus,
  TranscriptSourceType,
  TranscriptSummary,
} from "./types";
import type { TranscriptSegment } from "./types";

async function fetchJobs(): Promise<TranscriptSummary[]> {
  const res = await fetch("/api/transcription/jobs");
  if (!res.ok) throw new Error("Failed to load transcription jobs");
  return (await res.json()) as TranscriptSummary[];
}

async function fetchJob(id: string) {
  const res = await fetch(`/api/transcription/jobs/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  return (await res.json()) as { status: TranscriptJobStatus; error?: string };
}

async function fetchTranscript(id: string): Promise<TranscriptDetail | null> {
  const res = await fetch(`/api/transcription/jobs/${encodeURIComponent(id)}/transcript`);
  if (!res.ok) return null;
  return (await res.json()) as TranscriptDetail;
}

export function useLongformerStore() {
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<LongformerView>("library");
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [inspectorWidth, setInspectorWidth] = useState(280);
  const [timelineHeight, setTimelineHeight] = useState(200);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TranscriptJobStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<TranscriptSourceType | "all">("all");
  const [transcripts, setTranscripts] = useState<TranscriptSummary[]>([]);
  const [details, setDetails] = useState<Record<string, TranscriptDetail>>({});
  const [generatingArtifact, setGeneratingArtifact] = useState<ArtifactKind | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userName = user?.displayName ?? user?.username ?? LONGFORMER_MOCK.userName;
  const userEmail = LONGFORMER_MOCK.userEmail;

  const refreshJobs = useCallback(async () => {
    try {
      const jobs = await fetchJobs();
      setTranscripts(jobs);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to refresh jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs]);

  const processingCount = useMemo(
    () => transcripts.filter((t) => t.status === "queued" || t.status === "processing").length,
    [transcripts],
  );

  useEffect(() => {
    if (processingCount === 0) return;
    const interval = setInterval(() => {
      void refreshJobs();
      if (selectedTranscriptId) {
        void (async () => {
          const job = await fetchJob(selectedTranscriptId);
          if (job?.status === "ready" || job?.status === "failed") {
            const detail = await fetchTranscript(selectedTranscriptId);
            if (detail) setDetails((prev) => ({ ...prev, [selectedTranscriptId]: detail }));
          }
        })();
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [processingCount, refreshJobs, selectedTranscriptId]);

  const activeDetail = useMemo(() => {
    if (!selectedTranscriptId) return null;
    return details[selectedTranscriptId] ?? null;
  }, [details, selectedTranscriptId]);

  const openTranscript = useCallback(async (id: string) => {
    setSelectedTranscriptId(id);
    setView("editor");
    setIsPlaying(false);
    const detail = await fetchTranscript(id);
    if (detail) {
      setDetails((prev) => ({ ...prev, [id]: detail }));
    } else {
      const summary = transcripts.find((t) => t.id === id);
      if (summary) {
        setDetails((prev) => ({
          ...prev,
          [id]: {
            id,
            title: summary.title,
            projectName: summary.projectName ?? "Transcription",
            status: summary.status,
            durationMs: summary.durationMs,
            currentMs: 0,
            language: summary.language ?? "English",
            speakers: [{ id: "speaker-1", name: "Speaker 1", color: "var(--arco-longformer-speaker-julian)" }],
            segments: [
              {
                id: "seg-wait",
                speakerId: "speaker-1",
                startMs: 0,
                endMs: summary.durationMs,
                text: summary.excerpt ?? "Transcription in progress…",
                words: [],
              },
            ],
            chapters: [],
            tracks: [],
            mediaFiles: [],
            artifacts: [],
            selectedClipId: null,
            volumeDb: 0,
            speed: 1,
            compressorEnabled: false,
            compressorPreset: "Classic Voiceover",
          },
        }));
      }
    }
  }, [transcripts]);

  const closeEditor = useCallback(() => {
    setView("library");
    setSelectedTranscriptId(null);
    setIsPlaying(false);
  }, []);

  const setCurrentMs = useCallback((ms: number) => {
    if (!selectedTranscriptId) return;
    setDetails((prev) => {
      const detail = prev[selectedTranscriptId];
      if (!detail) return prev;
      return {
        ...prev,
        [selectedTranscriptId]: {
          ...detail,
          currentMs: Math.max(0, Math.min(ms, detail.durationMs)),
        },
      };
    });
  }, [selectedTranscriptId]);

  const togglePlayback = useCallback(() => setIsPlaying((p) => !p), []);

  const updateSegmentText = useCallback((segmentId: string, text: string) => {
    if (!selectedTranscriptId) return;
    setDetails((prev) => {
      const detail = prev[selectedTranscriptId];
      if (!detail) return prev;
      return {
        ...prev,
        [selectedTranscriptId]: {
          ...detail,
          segments: detail.segments.map((seg) => (seg.id === segmentId ? { ...seg, text } : seg)),
        },
      };
    });
  }, [selectedTranscriptId]);

  const selectClip = useCallback((clipId: string | null) => {
    if (!selectedTranscriptId) return;
    setDetails((prev) => {
      const detail = prev[selectedTranscriptId];
      if (!detail) return prev;
      return { ...prev, [selectedTranscriptId]: { ...detail, selectedClipId: clipId } };
    });
  }, [selectedTranscriptId]);

  const updateClipSettings = useCallback(
    (patch: Partial<Pick<TranscriptDetail, "volumeDb" | "speed" | "compressorEnabled" | "compressorPreset">>) => {
      if (!selectedTranscriptId) return;
      setDetails((prev) => {
        const detail = prev[selectedTranscriptId];
        if (!detail) return prev;
        return { ...prev, [selectedTranscriptId]: { ...detail, ...patch } };
      });
    },
    [selectedTranscriptId],
  );

  const generateArtifact = useCallback(
    async (kind: ArtifactKind) => {
      if (!selectedTranscriptId) return;
      setGeneratingArtifact(kind);
      try {
        const res = await fetch(
          `/api/transcription/jobs/${encodeURIComponent(selectedTranscriptId)}/artifacts/${kind}`,
          { method: "POST" },
        );
        if (!res.ok) throw new Error("Artifact generation failed");
        const detail = await fetchTranscript(selectedTranscriptId);
        if (detail) setDetails((prev) => ({ ...prev, [selectedTranscriptId]: detail }));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Artifact generation failed");
      } finally {
        setGeneratingArtifact(null);
      }
    },
    [selectedTranscriptId],
  );

  const uploadFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/transcription/jobs", { method: "POST", body });
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? `Upload failed (${res.status})`);
        }
        const { jobId } = (await res.json()) as { jobId: string };
        await refreshJobs();
        await openTranscript(jobId);
        setView("editor");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [openTranscript, refreshJobs],
  );

  const openFromMemory = useCallback(() => {
    openTranscript("tr-006");
  }, [openTranscript]);

  const openDemoProject = useCallback(() => {
    setDetails((prev) => ({ ...prev, "tr-beachcube-podcast": BEACHCUBE_PODCAST_DETAIL }));
    openTranscript("tr-beachcube-podcast");
  }, [openTranscript]);

  return {
    data: {
      ...LONGFORMER_MOCK,
      transcripts,
      processingCount,
      metrics: LONGFORMER_MOCK.metrics.map((m) =>
        m.id === "metric-processing" ? { ...m, value: processingCount } : m,
      ),
    },
    userName,
    userEmail,
    view,
    setView,
    selectedTranscriptId,
    activeDetail,
    sidebarWidth,
    setSidebarWidth,
    inspectorWidth,
    setInspectorWidth,
    timelineHeight,
    setTimelineHeight,
    isPlaying,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    generatingArtifact,
    loading,
    uploading,
    error,
    fileInputRef,
    handleFileSelected,
    openTranscript,
    closeEditor,
    setCurrentMs,
    togglePlayback,
    updateSegmentText,
    selectClip,
    updateClipSettings,
    generateArtifact,
    uploadFile,
    openFromMemory,
    openDemoProject,
    refreshJobs,
  };
}

export type LongformerViewModel = ReturnType<typeof useLongformerStore>;

export type { TranscriptSegment };
