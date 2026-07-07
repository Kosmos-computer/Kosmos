import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "../../os/auth/authStore";
import {
  defaultJobView,
  loadPersistedJobView,
  persistJobView,
} from "./jobNav";
import { isPersistableJobId } from "./artifactContent";
import { BEACHCUBE_PODCAST_DETAIL, LONGFORMER_MOCK } from "./longformerMock";
import type {
  ArtifactKind,
  LongformerJobView,
  LongformerView,
  TimelineClip,
  TranscriptDetail,
  TranscriptJobStatus,
  TranscriptionJob,
  TranscriptSourceType,
  TranscriptSummary,
} from "./types";
import type { TranscriptSegment } from "./types";

async function fetchJobs(): Promise<TranscriptSummary[]> {
  const res = await fetch("/api/transcription/jobs");
  if (!res.ok) throw new Error("Failed to load transcription jobs");
  return (await res.json()) as TranscriptSummary[];
}

async function fetchJob(id: string): Promise<TranscriptionJob | null> {
  const res = await fetch(`/api/transcription/jobs/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  return (await res.json()) as TranscriptionJob;
}

async function fetchTranscript(id: string): Promise<TranscriptDetail | null> {
  const res = await fetch(`/api/transcription/jobs/${encodeURIComponent(id)}/transcript`);
  if (!res.ok) return null;
  return (await res.json()) as TranscriptDetail;
}

async function patchTranscript(id: string, patch: Partial<TranscriptDetail>): Promise<TranscriptDetail | null> {
  const res = await fetch(`/api/transcription/jobs/${encodeURIComponent(id)}/transcript`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return null;
  return (await res.json()) as TranscriptDetail;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useLongformerStore() {
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [view, setView] = useState<LongformerView>("library");
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<string | null>(null);
  const [jobView, setJobViewState] = useState<LongformerJobView>("status");
  const [activeJob, setActiveJob] = useState<TranscriptionJob | null>(null);
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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

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
          if (job) setActiveJob(job);
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

  const schedulePersist = useCallback(
    (detail: TranscriptDetail) => {
      if (!selectedTranscriptId || !isPersistableJobId(selectedTranscriptId)) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus("saving");
      saveTimerRef.current = setTimeout(() => {
        void (async () => {
          const saved = await patchTranscript(selectedTranscriptId, {
            segments: detail.segments,
            speakers: detail.speakers,
            chapters: detail.chapters,
            tracks: detail.tracks,
            artifacts: detail.artifacts,
          });
          if (saved) {
            setDetails((prev) => ({ ...prev, [selectedTranscriptId]: saved }));
            setSaveStatus("saved");
          } else {
            setSaveStatus("error");
          }
        })();
      }, 800);
    },
    [selectedTranscriptId],
  );

  const applyDetailUpdate = useCallback(
    (updater: (detail: TranscriptDetail) => TranscriptDetail, persist = true) => {
      if (!selectedTranscriptId) return;
      setDetails((prev) => {
        const detail = prev[selectedTranscriptId];
        if (!detail) return prev;
        const next = updater(detail);
        if (persist) schedulePersist(next);
        return { ...prev, [selectedTranscriptId]: next };
      });
    },
    [schedulePersist, selectedTranscriptId],
  );

  const isJobMode = selectedTranscriptId !== null;

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const setJobView = useCallback(
    (next: LongformerJobView) => {
      setJobViewState(next);
      if (selectedTranscriptId) persistJobView(selectedTranscriptId, next);
    },
    [selectedTranscriptId],
  );

  const openTranscript = useCallback(async (id: string) => {
    setSelectedTranscriptId(id);
    setIsPlaying(false);

    const [job, detail] = await Promise.all([fetchJob(id), fetchTranscript(id)]);
    if (job) setActiveJob(job);

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

    const placeholderDetail =
      detail ??
      (() => {
        const summary = transcripts.find((t) => t.id === id);
        if (!summary) return null;
        return {
          id,
          title: summary.title,
          projectName: summary.projectName ?? "Transcription",
          status: summary.status,
          durationMs: summary.durationMs,
          currentMs: 0,
          language: summary.language ?? "English",
          speakers: [],
          segments: [],
          chapters: [],
          tracks: [],
          mediaFiles: [],
          artifacts: [],
          selectedClipId: null,
          volumeDb: 0,
          speed: 1,
          compressorEnabled: false,
          compressorPreset: "Classic Voiceover",
        } satisfies TranscriptDetail;
      })();

    const persisted = loadPersistedJobView(id);
    const initialView = persisted ?? defaultJobView(job, placeholderDetail);
    setJobViewState(initialView);
    persistJobView(id, initialView);
  }, [transcripts]);

  const closeEditor = useCallback(() => {
    setView("library");
    setSelectedTranscriptId(null);
    setActiveJob(null);
    setJobViewState("status");
    setIsPlaying(false);
    setSaveStatus("idle");
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

  const updateSegmentText = useCallback(
    (segmentId: string, text: string) => {
      applyDetailUpdate((detail) => ({
        ...detail,
        segments: detail.segments.map((seg) => (seg.id === segmentId ? { ...seg, text } : seg)),
      }));
    },
    [applyDetailUpdate],
  );

  const assignSegmentSpeaker = useCallback(
    (segmentIds: string[], speakerId: string) => {
      applyDetailUpdate((detail) => ({
        ...detail,
        segments: detail.segments.map((seg) =>
          segmentIds.includes(seg.id) ? { ...seg, speakerId } : seg,
        ),
      }));
    },
    [applyDetailUpdate],
  );

  const updateSpeakerName = useCallback(
    (speakerId: string, name: string) => {
      applyDetailUpdate((detail) => ({
        ...detail,
        speakers: detail.speakers.map((s) => (s.id === speakerId ? { ...s, name } : s)),
      }));
    },
    [applyDetailUpdate],
  );

  const createClipFromRange = useCallback(
    (startMs: number, endMs: number, label: string) => {
      applyDetailUpdate((detail) => {
        const clipId = `clip-${Date.now()}`;
        const newClip: TimelineClip = {
          id: clipId,
          label: label.slice(0, 48) + (label.length > 48 ? "…" : ""),
          startMs,
          endMs,
          trackId: "track-words",
        };
        const tracks = detail.tracks.length
          ? detail.tracks.map((track) =>
              track.kind === "words" ? { ...track, clips: [...track.clips, newClip] } : track,
            )
          : [
              {
                id: "track-words",
                label: "Words",
                kind: "words" as const,
                clips: [newClip],
              },
            ];
        return { ...detail, tracks, selectedClipId: clipId };
      });
    },
    [applyDetailUpdate],
  );

  const updateArtifactContent = useCallback(
    (kind: ArtifactKind, content: string) => {
      applyDetailUpdate((detail) => {
        const existing = detail.artifacts.find((a) => a.kind === kind);
        const artifacts = existing
          ? detail.artifacts.map((a) => (a.kind === kind ? { ...a, content } : a))
          : [
              ...detail.artifacts,
              {
                id: `art-${kind}-${Date.now()}`,
                kind,
                title: kind,
                content,
                createdAt: new Date().toLocaleString(),
                status: "ready" as const,
              },
            ];
        return { ...detail, artifacts };
      });
    },
    [applyDetailUpdate],
  );

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
    isJobMode,
    jobView,
    setJobView,
    activeJob,
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
    saveStatus,
    openTranscript,
    closeEditor,
    setCurrentMs,
    togglePlayback,
    updateSegmentText,
    assignSegmentSpeaker,
    updateSpeakerName,
    createClipFromRange,
    updateArtifactContent,
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
