import fs from "node:fs";
import path from "node:path";
import type { TranscriptDetail } from "../../shared/transcription/types.js";
import { ensureTranscriptionDirs, transcriptionDirs } from "./dirs.js";

function transcriptPath(id: string): string {
  return path.join(transcriptionDirs.transcripts, `${id}.json`);
}

export const transcriptStore = {
  save(detail: TranscriptDetail): void {
    ensureTranscriptionDirs();
    fs.writeFileSync(transcriptPath(detail.id), JSON.stringify(detail, null, 2), "utf-8");
  },

  get(id: string): TranscriptDetail | undefined {
    const file = transcriptPath(id);
    if (!fs.existsSync(file)) return undefined;
    try {
      return JSON.parse(fs.readFileSync(file, "utf-8")) as TranscriptDetail;
    } catch {
      return undefined;
    }
  },

  update(id: string, patch: Partial<TranscriptDetail>): TranscriptDetail | undefined {
    const existing = transcriptStore.get(id);
    if (!existing) return undefined;
    const next = { ...existing, ...patch };
    transcriptStore.save(next);
    return next;
  },
};
