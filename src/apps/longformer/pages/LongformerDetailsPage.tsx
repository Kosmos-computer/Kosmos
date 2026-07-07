import { ArtifactPageLayout } from "../ArtifactPageLayout";
import type { LongformerViewModel } from "../longformerStore";
import type { TranscriptDetail } from "../types";
import { formatDuration } from "../types";

interface LongformerDetailsPageProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** File metadata for the open transcript job. */
export function LongformerDetailsPage({ vm, detail }: LongformerDetailsPageProps) {
  const job = vm.activeJob;
  const media = detail.mediaFiles[0];

  return (
    <ArtifactPageLayout title="Details" description="Source file and transcription metadata.">
      <dl className="arco-longformer-details">
        <div className="arco-longformer-details__row">
          <dt>Title</dt>
          <dd>{detail.title}</dd>
        </div>
        <div className="arco-longformer-details__row">
          <dt>Project</dt>
          <dd>{detail.projectName}</dd>
        </div>
        <div className="arco-longformer-details__row">
          <dt>Status</dt>
          <dd>{detail.status}</dd>
        </div>
        <div className="arco-longformer-details__row">
          <dt>Duration</dt>
          <dd>{formatDuration(detail.durationMs)}</dd>
        </div>
        <div className="arco-longformer-details__row">
          <dt>Language</dt>
          <dd>{detail.language}</dd>
        </div>
        {media ? (
          <>
            <div className="arco-longformer-details__row">
              <dt>File</dt>
              <dd>
                {media.name}.{media.extension}
              </dd>
            </div>
            <div className="arco-longformer-details__row">
              <dt>Kind</dt>
              <dd>{media.kind}</dd>
            </div>
          </>
        ) : null}
        {job?.engine ? (
          <div className="arco-longformer-details__row">
            <dt>STT engine</dt>
            <dd>{job.engine}</dd>
          </div>
        ) : null}
        {job?.createdAt ? (
          <div className="arco-longformer-details__row">
            <dt>Created</dt>
            <dd>{new Date(job.createdAt).toLocaleString()}</dd>
          </div>
        ) : null}
      </dl>
    </ArtifactPageLayout>
  );
}
