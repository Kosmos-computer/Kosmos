import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import type {
  TranscriptJobStatus,
  TranscriptSourceType,
  TranscriptSummary,
  TranscriptionJob,
} from "../../shared/transcription/types.js";
import {
  createInitialSteps,
  type StepState,
  type TranscriptionStep,
} from "../../shared/transcription/steps.js";
import { ensureTranscriptionDirs, transcriptionDirs } from "./dirs.js";

interface JobRow {
  id: string;
  sourceType: string;
  sourceRef: string;
  title: string;
  status: string;
  stepsJson: string;
  engine: string | null;
  durationMs: number | null;
  wordCount: number | null;
  speakerCount: number | null;
  language: string | null;
  error: string | null;
  transcriptId: string | null;
  mediaPath: string | null;
  createdAt: string;
  updatedAt: string;
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    ensureTranscriptionDirs();
    db = new Database(transcriptionDirs.db);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS transcription_jobs (
        id TEXT PRIMARY KEY,
        sourceType TEXT NOT NULL,
        sourceRef TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        stepsJson TEXT NOT NULL,
        engine TEXT,
        durationMs INTEGER,
        wordCount INTEGER,
        speakerCount INTEGER,
        language TEXT,
        error TEXT,
        transcriptId TEXT,
        mediaPath TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tx_jobs_status ON transcription_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_tx_jobs_updated ON transcription_jobs(updatedAt);
    `);
  }
  return db;
}

function parseSteps(json: string): Record<TranscriptionStep, StepState> {
  return JSON.parse(json) as Record<TranscriptionStep, StepState>;
}

function rowToJob(row: JobRow): TranscriptionJob & { mediaPath?: string } {
  return {
    id: row.id,
    sourceType: row.sourceType as TranscriptSourceType,
    sourceRef: row.sourceRef,
    title: row.title,
    status: row.status as TranscriptJobStatus,
    steps: parseSteps(row.stepsJson),
    engine: row.engine ?? undefined,
    durationMs: row.durationMs ?? undefined,
    wordCount: row.wordCount ?? undefined,
    speakerCount: row.speakerCount ?? undefined,
    language: row.language ?? undefined,
    error: row.error ?? undefined,
    transcriptId: row.transcriptId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    mediaPath: row.mediaPath ?? undefined,
  };
}

function sourceLabel(sourceType: TranscriptSourceType): string {
  const labels: Record<TranscriptSourceType, string> = {
    upload: "Manual Upload",
    podcast: "Podcast",
    broadcast: "Music Broadcast",
    call: "Call",
    meeting: "Meeting",
    recording: "Recording",
    memory: "Memory",
  };
  return labels[sourceType] ?? sourceType;
}

function jobToSummary(job: TranscriptionJob): TranscriptSummary {
  return {
    id: job.id,
    title: job.title,
    sourceType: job.sourceType,
    sourceLabel: sourceLabel(job.sourceType),
    status: job.status,
    durationMs: job.durationMs ?? 0,
    wordCount: job.wordCount,
    speakerCount: job.speakerCount,
    createdAt: new Date(job.createdAt).toLocaleString(),
    createdAtMs: Date.parse(job.createdAt),
    excerpt:
      job.status === "failed"
        ? job.error?.slice(0, 120)
        : job.status === "ready"
          ? `${(job.wordCount ?? 0).toLocaleString()} words`
          : "Processing…",
    language: job.language,
    projectName: job.sourceType === "upload" ? "Uploads" : "Transcription",
  };
}

export const transcriptionJobStore = {
  create(input: {
    sourceType: TranscriptSourceType;
    sourceRef: string;
    title: string;
    mediaPath?: string;
  }): TranscriptionJob {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const steps = createInitialSteps();
    getDb()
      .prepare(
        `INSERT INTO transcription_jobs
         (id, sourceType, sourceRef, title, status, stepsJson, mediaPath, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'queued', ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.sourceType,
        input.sourceRef,
        input.title,
        JSON.stringify(steps),
        input.mediaPath ?? null,
        now,
        now,
      );
    return rowToJob(
      getDb().prepare("SELECT * FROM transcription_jobs WHERE id = ?").get(id) as JobRow,
    );
  },

  get(id: string): (TranscriptionJob & { mediaPath?: string }) | undefined {
    const row = getDb().prepare("SELECT * FROM transcription_jobs WHERE id = ?").get(id) as
      | JobRow
      | undefined;
    return row ? rowToJob(row) : undefined;
  },

  list(filters: { status?: TranscriptJobStatus; sourceType?: TranscriptSourceType } = {}): TranscriptSummary[] {
    const clauses: string[] = [];
    const bind: Record<string, string> = {};
    if (filters.status) {
      clauses.push("status = $status");
      bind.status = filters.status;
    }
    if (filters.sourceType) {
      clauses.push("sourceType = $sourceType");
      bind.sourceType = filters.sourceType;
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = getDb()
      .prepare(`SELECT * FROM transcription_jobs ${where} ORDER BY updatedAt DESC LIMIT 200`)
      .all(bind) as JobRow[];
    return rows.map((r) => jobToSummary(rowToJob(r)));
  },

  listActive(): (TranscriptionJob & { mediaPath?: string })[] {
    const rows = getDb()
      .prepare(
        `SELECT * FROM transcription_jobs WHERE status IN ('queued', 'processing') ORDER BY createdAt ASC LIMIT 20`,
      )
      .all() as JobRow[];
    return rows.map(rowToJob);
  },

  update(
    id: string,
    patch: Partial<{
      status: TranscriptJobStatus;
      steps: Record<TranscriptionStep, StepState>;
      engine: string;
      durationMs: number;
      wordCount: number;
      speakerCount: number;
      language: string;
      error: string | null;
      transcriptId: string;
      mediaPath: string;
    }>,
  ): TranscriptionJob | undefined {
    const existing = transcriptionJobStore.get(id);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const next = {
      status: patch.status ?? existing.status,
      stepsJson: JSON.stringify(patch.steps ?? existing.steps),
      engine: patch.engine ?? existing.engine ?? null,
      durationMs: patch.durationMs ?? existing.durationMs ?? null,
      wordCount: patch.wordCount ?? existing.wordCount ?? null,
      speakerCount: patch.speakerCount ?? existing.speakerCount ?? null,
      language: patch.language ?? existing.language ?? null,
      error: patch.error === null ? null : (patch.error ?? existing.error ?? null),
      transcriptId: patch.transcriptId ?? existing.transcriptId ?? null,
      mediaPath: patch.mediaPath ?? existing.mediaPath ?? null,
      updatedAt: now,
    };

    getDb()
      .prepare(
        `UPDATE transcription_jobs SET
          status = ?, stepsJson = ?, engine = ?, durationMs = ?, wordCount = ?,
          speakerCount = ?, language = ?, error = ?, transcriptId = ?, mediaPath = ?, updatedAt = ?
         WHERE id = ?`,
      )
      .run(
        next.status,
        next.stepsJson,
        next.engine,
        next.durationMs,
        next.wordCount,
        next.speakerCount,
        next.language,
        next.error,
        next.transcriptId,
        next.mediaPath,
        next.updatedAt,
        id,
      );

    return transcriptionJobStore.get(id);
  },

  setStep(id: string, step: TranscriptionStep, state: Partial<StepState>): void {
    const job = transcriptionJobStore.get(id);
    if (!job) return;
    const steps = { ...job.steps };
    steps[step] = { ...steps[step], ...state };
    transcriptionJobStore.update(id, { steps, status: job.status === "queued" ? "processing" : job.status });
  },

  delete(id: string): boolean {
    const info = getDb().prepare("DELETE FROM transcription_jobs WHERE id = ?").run(id);
    const workDir = path.join(transcriptionDirs.work, id);
    fs.rmSync(workDir, { recursive: true, force: true });
    return info.changes > 0;
  },

  toSummary: jobToSummary,
};
