import fs from "node:fs";
import path from "node:path";
import { announceAppEvent } from "../bus.js";
import {
  buildTranscriptDetail,
  plainToSegments,
  whisperVerboseToSegments,
  type WhisperVerboseResult,
} from "../../shared/transcription/formats/toDetail.js";
import type { PlainSttResult } from "../../shared/transcription/formats/toDetail.js";
import {
  POSTPROCESS_STEPS,
  PREPROCESS_STEPS,
  type TranscriptionStep,
} from "../../shared/transcription/steps.js";
import type { TranscriptionJob } from "../../shared/transcription/types.js";
import { normalizedAudioPath, sttResultPath } from "./dirs.js";
import { runStt, type SttEngineResult } from "./engines/stt.js";
import { enrichTranscript, generateHeuristicChapters } from "./enrich.js";
import { transcriptionJobStore } from "./jobStore.js";
import { ffmpegAvailable, probeDurationMs, transcodeToWav16k } from "./media.js";
import { transcriptStore } from "./transcriptStore.js";

function notify(jobId: string): void {
  announceAppEvent("transcription.job.updated", { appId: "system", payload: { jobId } });
}

function nextStep(job: TranscriptionJob): TranscriptionStep | null {
  for (const step of [...PREPROCESS_STEPS, ...POSTPROCESS_STEPS]) {
    const state = job.steps[step];
    if (state.status === "pending" || state.status === "failed") return step;
  }
  return null;
}

async function runStep(job: TranscriptionJob & { mediaPath?: string }): Promise<void> {
  const step = nextStep(job);
  if (!step) {
    if (job.status !== "ready" && job.status !== "failed") {
      transcriptionJobStore.update(job.id, { status: "ready", error: null });
      notify(job.id);
    }
    return;
  }

  if (job.steps[step].status === "complete") return;

  transcriptionJobStore.setStep(job.id, step, {
    status: "running",
    startedAt: new Date().toISOString(),
    error: undefined,
  });
  transcriptionJobStore.update(job.id, { status: "processing", error: null });
  notify(job.id);

  try {
    switch (step) {
      case "media_resolved":
        await stepMediaResolved(job);
        break;
      case "audio_transcoded":
        await stepAudioTranscoded(job);
        break;
      case "transcription_requested":
        await stepTranscribe(job, step);
        break;
      case "transcription_complete":
        if (!fs.existsSync(sttResultPath(job.id))) {
          throw new Error("STT result missing");
        }
        break;
      case "transcript_normalized":
        await stepNormalize(job);
        break;
      case "transcript_persisted":
        await stepPersist(job);
        break;
      case "chapters_generated":
        await stepChapters(job);
        break;
      case "artifacts_generated":
        await stepArtifacts(job);
        break;
      default:
        break;
    }

    transcriptionJobStore.setStep(job.id, step, {
      status: "complete",
      completedAt: new Date().toISOString(),
    });
    notify(job.id);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Pipeline step failed";
    transcriptionJobStore.setStep(job.id, step, {
      status: "failed",
      error: message,
      completedAt: new Date().toISOString(),
    });
    transcriptionJobStore.update(job.id, { status: "failed", error: message });
    notify(job.id);
  }
}

async function stepMediaResolved(job: TranscriptionJob & { mediaPath?: string }): Promise<void> {
  const mediaPath = job.mediaPath;
  if (!mediaPath || !fs.existsSync(mediaPath)) {
    throw new Error("Source media file not found");
  }
  const durationMs = await probeDurationMs(mediaPath);
  transcriptionJobStore.update(job.id, { durationMs: durationMs || undefined });
}

async function stepAudioTranscoded(job: TranscriptionJob & { mediaPath?: string }): Promise<void> {
  const mediaPath = job.mediaPath;
  if (!mediaPath) throw new Error("Missing media path");

  const outPath = normalizedAudioPath(job.id);
  const ext = path.extname(mediaPath).toLowerCase();
  if (ext === ".wav" && mediaPath.includes("/work/")) {
    fs.copyFileSync(mediaPath, outPath);
    return;
  }

  if (!(await ffmpegAvailable())) {
    if (ext === ".wav") {
      fs.copyFileSync(mediaPath, outPath);
      return;
    }
    throw new Error("ffmpeg is required to transcode uploaded audio");
  }

  await transcodeToWav16k(mediaPath, outPath);
}

async function stepTranscribe(job: TranscriptionJob, step: TranscriptionStep): Promise<void> {
  const wavPath = normalizedAudioPath(job.id);
  if (!fs.existsSync(wavPath)) throw new Error("Normalized audio missing");

  if (fs.existsSync(sttResultPath(job.id))) {
    if (step === "transcription_requested") {
      transcriptionJobStore.setStep(job.id, "transcription_requested", {
        status: "complete",
        completedAt: new Date().toISOString(),
      });
    }
    return;
  }

  const result = await runStt(wavPath);
  fs.writeFileSync(sttResultPath(job.id), JSON.stringify(result, null, 2), "utf-8");
  transcriptionJobStore.update(job.id, { engine: result.engine });
  transcriptionJobStore.setStep(job.id, "transcription_requested", {
    status: "complete",
    completedAt: new Date().toISOString(),
  });
}

async function stepNormalize(job: TranscriptionJob): Promise<void> {
  const full = transcriptionJobStore.get(job.id);
  const rawPath = sttResultPath(job.id);
  if (!fs.existsSync(rawPath)) throw new Error("STT result missing");

  const result = JSON.parse(fs.readFileSync(rawPath, "utf-8")) as SttEngineResult;
  const durationMs = job.durationMs ?? 0;

  let segments;
  if (result.format === "whisper_verbose" && result.whisperVerbose) {
    segments = whisperVerboseToSegments(result.whisperVerbose as WhisperVerboseResult);
  } else {
    const plain = result.plain as PlainSttResult;
    segments = plainToSegments(plain.text, durationMs);
  }

  const wordCount = segments
    .map((s) => s.text)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  const speakerIds = new Set(segments.map((s) => s.speakerId));
  const detail = buildTranscriptDetail({
    id: job.id,
    title: job.title,
    projectName: job.sourceType === "upload" ? "Uploads" : "Transcription",
    status: "processing",
    durationMs: Math.max(durationMs, ...segments.map((s) => s.endMs), 0),
    language: result.whisperVerbose?.language ?? job.language ?? "English",
    segments,
    mediaFiles: full?.mediaPath
      ? [
          {
            id: "media-0",
            name: path.basename(full.mediaPath),
            kind: "audio",
            extension: path.extname(full.mediaPath).replace(".", "") || "audio",
            durationMs,
          },
        ]
      : [],
  });

  fs.writeFileSync(
    path.join(path.dirname(rawPath), "detail-draft.json"),
    JSON.stringify(detail, null, 2),
    "utf-8",
  );

  transcriptionJobStore.update(job.id, {
    wordCount,
    speakerCount: speakerIds.size,
    language: detail.language,
    durationMs: detail.durationMs,
  });
}

async function stepPersist(job: TranscriptionJob): Promise<void> {
  const draftPath = path.join(path.dirname(sttResultPath(job.id)), "detail-draft.json");
  if (!fs.existsSync(draftPath)) throw new Error("Normalized transcript missing");

  const detail = JSON.parse(fs.readFileSync(draftPath, "utf-8")) as ReturnType<typeof buildTranscriptDetail>;
  detail.status = "ready";
  transcriptStore.save(detail);
  transcriptionJobStore.update(job.id, {
    transcriptId: job.id,
    status: "ready",
    error: null,
  });
}

async function stepChapters(job: TranscriptionJob): Promise<void> {
  const detail = transcriptStore.get(job.id);
  if (!detail) throw new Error("Transcript not found for chapter generation");
  const chapters = generateHeuristicChapters(detail);
  transcriptStore.save({ ...detail, chapters });
}

async function stepArtifacts(job: TranscriptionJob): Promise<void> {
  const detail = transcriptStore.get(job.id);
  if (!detail) throw new Error("Transcript not found for artifact generation");
  const enriched = await enrichTranscript(detail);
  transcriptStore.save(enriched);
  transcriptionJobStore.update(job.id, { status: "ready" });
}

export async function advanceJob(jobId: string): Promise<void> {
  let job = transcriptionJobStore.get(jobId);
  if (!job || job.status === "failed") return;

  if (job.status === "ready") {
    const pendingPost = POSTPROCESS_STEPS.some((s) => job!.steps[s].status === "pending");
    if (!pendingPost) return;
    transcriptionJobStore.update(jobId, { status: "processing" });
    job = transcriptionJobStore.get(jobId);
    if (!job) return;
  }

  const step = nextStep(job);
  if (!step) {
    if (job.status === "processing") {
      transcriptionJobStore.update(jobId, { status: "ready", error: null });
      notify(jobId);
    }
    return;
  }

  await runStep(job);
}

export async function advanceAllActiveJobs(): Promise<void> {
  const ids = new Set<string>();

  for (const job of transcriptionJobStore.listActive()) {
    ids.add(job.id);
  }

  for (const summary of transcriptionJobStore.list()) {
    const full = transcriptionJobStore.get(summary.id);
    if (!full) continue;
    const pendingPost =
      full.status === "ready" &&
      POSTPROCESS_STEPS.some((s) => full.steps[s].status === "pending");
    if (pendingPost) ids.add(full.id);
  }

  for (const id of ids) {
    try {
      let guard = 0;
      while (guard < 12) {
        guard += 1;
        const before = transcriptionJobStore.get(id);
        if (!before || before.status === "failed") break;
        const step = nextStep(before);
        if (!step) break;
        await advanceJob(id);
        const after = transcriptionJobStore.get(id);
        if (!after || after.status === "failed") break;
        if (after.steps[step].status !== "complete") break;
      }
    } catch (err: unknown) {
      console.warn(`[transcription] job ${id} failed:`, err);
    }
  }
}
