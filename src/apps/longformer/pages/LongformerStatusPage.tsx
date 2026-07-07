import { TRANSCRIPTION_STEPS } from "@shared/transcription/steps";
import { ArtifactPageLayout } from "../ArtifactPageLayout";
import type { LongformerViewModel } from "../longformerStore";
import type { TranscriptDetail } from "../types";

const STEP_LABELS: Record<(typeof TRANSCRIPTION_STEPS)[number], string> = {
  media_resolved: "Resolve media",
  audio_transcoded: "Transcode audio",
  transcription_requested: "Transcribe",
  transcription_complete: "Transcription complete",
  transcript_normalized: "Normalize transcript",
  transcript_persisted: "Save transcript",
  chapters_generated: "Generate chapters",
  artifacts_generated: "Generate assets",
};

interface LongformerStatusPageProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Pipeline progress for the open transcription job. */
export function LongformerStatusPage({ vm, detail }: LongformerStatusPageProps) {
  const job = vm.activeJob;
  const steps = job?.steps;

  return (
    <ArtifactPageLayout
      title="Processing status"
      description={
        job?.error
          ? job.error
          : detail.status === "ready"
            ? "Transcription is complete. Open Transcript or an asset page from the sidebar."
            : "Your file is being transcribed. This page updates automatically."
      }
    >
      {job?.error ? <p className="arco-longformer-status__error">{job.error}</p> : null}

      <ol className="arco-longformer-status__steps">
        {TRANSCRIPTION_STEPS.map((step) => {
          const state = steps?.[step];
          const status = state?.status ?? "pending";
          return (
            <li key={step} className="arco-longformer-status__step" data-status={status}>
              <span className="arco-longformer-status__step-label">{STEP_LABELS[step]}</span>
              <span className="arco-longformer-status__step-state">{status}</span>
              {state?.error ? <span className="arco-longformer-status__step-error">{state.error}</span> : null}
            </li>
          );
        })}
      </ol>
    </ArtifactPageLayout>
  );
}
