import { useCallback, useMemo, useState } from "react";
import { useAuthStore } from "../../os/auth/authStore";
import { BEACHCUBE_PODCAST_DETAIL, LONGFORMER_MOCK } from "./longformerMock";
import type {
  ArtifactKind,
  GeneratedArtifact,
  LongformerJobView,
  LongformerView,
  TranscriptDetail,
  TranscriptSegment,
  TranscriptSourceType,
  TranscriptStatus,
  TranscriptSummary,
} from "./types";

const ARTIFACT_TEMPLATES: Record<ArtifactKind, (detail: TranscriptDetail) => GeneratedArtifact> = {
  chapters: (detail) => ({
    id: `art-${Date.now()}`,
    kind: "chapters",
    title: "Chapter markers",
    content: detail.chapters.map((ch, i) => `${i + 1}. ${ch.label} (${formatChapterTime(ch.startMs)})`).join("\n"),
    createdAt: "Just now",
    status: "ready",
  }),
  clips: (detail) => ({
    id: `art-${Date.now()}`,
    kind: "clips",
    title: "Suggested clips",
    content: detail.tracks
      .find((t) => t.kind === "words")
      ?.clips.map((c) => `• ${c.label} (${(c.endMs - c.startMs) / 1000}s)`)
      .join("\n") ?? "No clips generated.",
    createdAt: "Just now",
    status: "ready",
  }),
  reels: () => ({
    id: `art-${Date.now()}`,
    kind: "reels",
    title: "Short-form reel script",
    content:
      "HOOK: You can't separate the music from the beach.\n\nBODY: Light My Fire → California Girls → the podcast format.\n\nCTA: Full episode in bio.",
    createdAt: "Just now",
    status: "draft",
  }),
  titles: (detail) => ({
    id: `art-${Date.now()}`,
    kind: "titles",
    title: "Title options",
    content: [
      `Surf, Sound & Story: ${detail.title}`,
      "West Coast Tracks That Built Podcasting",
      "From Light My Fire to California Girls — A Beach Episode",
    ].join("\n"),
    createdAt: "Just now",
    status: "ready",
  }),
  notes: (detail) => ({
    id: `art-${Date.now()}`,
    kind: "notes",
    title: "Editor notes",
    content: `Project: ${detail.projectName}\nSpeakers: ${detail.speakers.map((s) => s.name).join(", ")}\nTrim filler words in segment 2. Consider B-roll at chapter break.`,
    createdAt: "Just now",
    status: "draft",
  }),
  summaries: (detail) => ({
    id: `art-${Date.now()}`,
    kind: "summaries",
    title: "Episode summary",
    content: detail.segments
      .slice(0, 3)
      .map((s) => s.text)
      .join(" ")
      .slice(0, 280),
    createdAt: "Just now",
    status: "ready",
  }),
  quotes: (detail) => ({
    id: `art-${Date.now()}`,
    kind: "quotes",
    title: "Pull quotes",
    content: detail.segments
      .filter((s) => s.text.length > 40)
      .slice(0, 3)
      .map((s) => `"${s.text.slice(0, 80)}…"`)
      .join("\n"),
    createdAt: "Just now",
    status: "ready",
  }),
};

function formatChapterTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function createStubDetail(summary: TranscriptSummary): TranscriptDetail {
  return {
    id: summary.id,
    title: summary.title,
    projectName: summary.projectName ?? "Untitled Project",
    status: summary.status,
    durationMs: summary.durationMs,
    currentMs: 0,
    language: summary.language ?? "English",
    speakers: [
      { id: "speaker-1", name: "Speaker 1", color: "var(--arco-longformer-speaker-julian)" },
      { id: "speaker-2", name: "Speaker 2", color: "var(--arco-longformer-speaker-hunter)" },
    ],
    segments: [
      {
        id: "seg-stub-1",
        speakerId: "speaker-1",
        startMs: 0,
        endMs: summary.durationMs,
        text: summary.excerpt?.replace(/^…|…$/g, "") ?? "Transcript content will appear here after processing completes.",
        words: [],
      },
    ],
    chapters: [],
    tracks: [
      {
        id: "track-wave-stub",
        label: "Audio",
        kind: "waveform",
        clips: [{ id: "clip-stub", label: "Full clip", startMs: 0, endMs: summary.durationMs, trackId: "track-wave-stub" }],
      },
    ],
    mediaFiles: [],
    artifacts: [],
    selectedClipId: null,
    volumeDb: 0,
    speed: 1,
    compressorEnabled: false,
    compressorPreset: "Classic Voiceover",
  };
}

/** STUB: replace with useLongformerStore when API exists */
export function useLongformerStub() {
  const user = useAuthStore((s) => s.user);
  const [view, setView] = useState<LongformerView>("library");
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<string | null>(null);
  const [jobView, setJobView] = useState<LongformerJobView>("transcript");
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [inspectorWidth, setInspectorWidth] = useState(280);
  const [timelineHeight, setTimelineHeight] = useState(200);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TranscriptStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<TranscriptSourceType | "all">("all");
  const [transcripts, setTranscripts] = useState(LONGFORMER_MOCK.transcripts);
  const [details, setDetails] = useState<Record<string, TranscriptDetail>>(LONGFORMER_MOCK.details);
  const [generatingArtifact, setGeneratingArtifact] = useState<ArtifactKind | null>(null);

  const userName = user?.displayName ?? user?.username ?? LONGFORMER_MOCK.userName;
  const userEmail = LONGFORMER_MOCK.userEmail;

  const activeDetail = useMemo(() => {
    if (!selectedTranscriptId) return null;
    return details[selectedTranscriptId] ?? null;
  }, [details, selectedTranscriptId]);

  const openTranscript = useCallback(
    (id: string) => {
      setSelectedTranscriptId(id);
      setJobView("transcript");
      setDetails((prev) => {
        if (prev[id]) return prev;
        const summary = LONGFORMER_MOCK.transcripts.find((t) => t.id === id);
        if (!summary) return prev;
        return { ...prev, [id]: createStubDetail(summary) };
      });
    },
    [],
  );

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
      return { ...prev, [selectedTranscriptId]: { ...detail, currentMs: Math.max(0, Math.min(ms, detail.durationMs)) } };
    });
  }, [selectedTranscriptId]);

  const togglePlayback = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const updateSegmentText = useCallback(
    (segmentId: string, text: string) => {
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
    },
    [selectedTranscriptId],
  );

  const selectClip = useCallback(
    (clipId: string | null) => {
      if (!selectedTranscriptId) return;
      setDetails((prev) => {
        const detail = prev[selectedTranscriptId];
        if (!detail) return prev;
        return { ...prev, [selectedTranscriptId]: { ...detail, selectedClipId: clipId } };
      });
    },
    [selectedTranscriptId],
  );

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
      const detail = details[selectedTranscriptId];
      if (!detail) return;
      setGeneratingArtifact(kind);
      await new Promise((r) => setTimeout(r, 900));
      const artifact = ARTIFACT_TEMPLATES[kind](detail);
      setDetails((prev) => {
        const d = prev[selectedTranscriptId];
        if (!d) return prev;
        return { ...prev, [selectedTranscriptId]: { ...d, artifacts: [artifact, ...d.artifacts] } };
      });
      setGeneratingArtifact(null);
    },
    [details, selectedTranscriptId],
  );

  const uploadFile = useCallback(() => {
    const id = `tr-upload-${Date.now()}`;
    const summary: TranscriptSummary = {
      id,
      title: "Uploaded recording",
      projectName: "Uploads",
      sourceType: "upload",
      sourceLabel: "Manual Upload",
      status: "processing",
      durationMs: 0,
      createdAt: "Just now",
      createdAtMs: Date.now(),
      excerpt: "Transcription queued…",
      language: "English",
    };
    setTranscripts((prev) => [summary, ...prev]);
    openTranscript(id);
  }, [openTranscript]);

  const openFromMemory = useCallback(() => {
    openTranscript("tr-006");
  }, [openTranscript]);

  const openDemoProject = useCallback(() => {
    setDetails((prev) => ({ ...prev, "tr-beachcube-podcast": BEACHCUBE_PODCAST_DETAIL }));
    openTranscript("tr-beachcube-podcast");
  }, [openTranscript]);

  return {
    data: { ...LONGFORMER_MOCK, transcripts },
    userName,
    userEmail,
    view,
    setView,
    isJobMode: selectedTranscriptId !== null,
    jobView,
    setJobView,
    activeJob: null,
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
    loading: false,
    uploading: false,
    error: null,
    fileInputRef: { current: null },
    handleFileSelected: async () => {},
    refreshJobs: async () => {},
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
  };
}

export type LongformerViewModel = ReturnType<typeof useLongformerStub>;

export type { TranscriptSegment };
