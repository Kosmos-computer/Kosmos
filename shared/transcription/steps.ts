/** Canonical transcription pipeline step names (Fathom process-attribute mirror). */

export const TRANSCRIPTION_STEPS = [
  "media_resolved",
  "audio_transcoded",
  "transcription_requested",
  "transcription_complete",
  "transcript_normalized",
  "transcript_persisted",
  "chapters_generated",
  "artifacts_generated",
] as const;

export type TranscriptionStep = (typeof TRANSCRIPTION_STEPS)[number];

export type StepStatus = "pending" | "running" | "complete" | "failed" | "skipped";

export interface StepState {
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export function createInitialSteps(): Record<TranscriptionStep, StepState> {
  const steps = {} as Record<TranscriptionStep, StepState>;
  for (const name of TRANSCRIPTION_STEPS) {
    steps[name] = { status: "pending" };
  }
  return steps;
}

/** Steps that must complete before the editor can open the transcript. */
export const PREPROCESS_STEPS: TranscriptionStep[] = [
  "media_resolved",
  "audio_transcoded",
  "transcription_requested",
  "transcription_complete",
  "transcript_normalized",
  "transcript_persisted",
];

/** Background enrichment after the transcript is readable. */
export const POSTPROCESS_STEPS: TranscriptionStep[] = ["chapters_generated", "artifacts_generated"];
