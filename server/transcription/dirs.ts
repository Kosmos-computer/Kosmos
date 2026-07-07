import fs from "node:fs";
import path from "node:path";
import { dataDirs } from "../env.js";

export const transcriptionDirs = {
  root: path.join(dataDirs.root, "transcription"),
  uploads: path.join(dataDirs.root, "transcription", "uploads"),
  work: path.join(dataDirs.root, "transcription", "work"),
  transcripts: path.join(dataDirs.root, "transcripts"),
  db: path.join(dataDirs.db, "transcription-jobs.sqlite"),
};

export function ensureTranscriptionDirs(): void {
  for (const dir of [
    transcriptionDirs.root,
    transcriptionDirs.uploads,
    transcriptionDirs.work,
    transcriptionDirs.transcripts,
    dataDirs.db,
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function jobWorkDir(jobId: string): string {
  const dir = path.join(transcriptionDirs.work, jobId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function sttResultPath(jobId: string): string {
  return path.join(jobWorkDir(jobId), "stt-result.json");
}

export function normalizedAudioPath(jobId: string): string {
  return path.join(jobWorkDir(jobId), "audio.wav");
}
