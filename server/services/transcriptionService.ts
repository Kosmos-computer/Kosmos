import fs from "node:fs";
import path from "node:path";
import type { ArtifactKind, TranscriptSourceType } from "../../shared/transcription/types.js";
import { ensureTranscriptionDirs, transcriptionDirs } from "../transcription/dirs.js";
import { generateArtifact, enrichTranscript } from "../transcription/enrich.js";
import { transcriptionJobStore } from "../transcription/jobStore.js";
import { listEngines } from "../transcription/engines/stt.js";
import { transcriptStore } from "../transcription/transcriptStore.js";

const AUDIO_EXT = new Set([".mp3", ".m4a", ".wav", ".aac", ".ogg", ".flac", ".webm", ".mp4", ".mov", ".mkv"]);

export const transcriptionService = {
  listJobs(filters: { status?: "queued" | "processing" | "ready" | "failed"; sourceType?: TranscriptSourceType } = {}) {
    return transcriptionJobStore.list(filters);
  },

  getJob(id: string) {
    return transcriptionJobStore.get(id);
  },

  getTranscript(id: string) {
    return transcriptStore.get(id);
  },

  async createUploadJob(file: { name: string; arrayBuffer(): Promise<ArrayBuffer> }): Promise<{ jobId: string }> {
    ensureTranscriptionDirs();
    const job = transcriptionJobStore.create({
      sourceType: "upload",
      sourceRef: "upload",
      title: file.name.replace(/\.[^.]+$/, "") || "Uploaded recording",
    });

    const ext = path.extname(file.name).toLowerCase();
    if (!AUDIO_EXT.has(ext)) {
      transcriptionJobStore.update(job.id, {
        status: "failed",
        error: `Unsupported file type: ${ext || "(none)"}`,
      });
      throw new Error(`Unsupported file type: ${ext}`);
    }

    const destDir = path.join(transcriptionDirs.uploads, job.id);
    fs.mkdirSync(destDir, { recursive: true });
    const mediaPath = path.join(destDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(mediaPath, buffer);

    transcriptionJobStore.update(job.id, { mediaPath, status: "queued" });
    return { jobId: job.id };
  },

  async regenerateArtifact(jobId: string, kind: ArtifactKind) {
    const detail = transcriptStore.get(jobId);
    if (!detail) throw new Error("Transcript not found");
    const artifact = generateArtifact(kind, detail);
    const artifacts = [artifact, ...detail.artifacts.filter((a) => a.kind !== kind)];
    transcriptStore.save({ ...detail, artifacts });
    return artifact;
  },

  async rerunEnrichment(jobId: string) {
    const detail = transcriptStore.get(jobId);
    if (!detail) throw new Error("Transcript not found");
    const enriched = await enrichTranscript(detail);
    transcriptStore.save(enriched);
    return enriched;
  },

  deleteJob(id: string) {
    return transcriptionJobStore.delete(id);
  },

  listEngines,
};
