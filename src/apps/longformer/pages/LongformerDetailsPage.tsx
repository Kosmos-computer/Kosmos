import { I18nKey } from "../../../i18n/declaration";
import i18n from "../../../i18n/index";
import { T } from "../../../i18n/T";
import { ArtifactPageLayout } from "../ArtifactPageLayout";
import type { LongformerViewModel } from "../longformerStore";
import type { TranscriptDetail } from "../types";
import { formatDuration } from "../types";
import { useTranslation } from "react-i18next";

interface LongformerDetailsPageProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** File metadata for the open transcript job. */
export function LongformerDetailsPage({ vm, detail }: LongformerDetailsPageProps) {
  const { t } = useTranslation();
  const job = vm.activeJob;
  const media = detail.mediaFiles[0];

  return (
    <ArtifactPageLayout title={i18n.t(I18nKey.APPS$FILES_DETAILS)} description="Source file and transcription metadata.">
      <dl className="arco-longformer-details">
        <div className="arco-longformer-details__row">
          <dt><T k={I18nKey.APPS$LONGFORMER_TITLE} /></dt>
          <dd>{detail.title}</dd>
        </div>
        <div className="arco-longformer-details__row">
          <dt><T k={I18nKey.APPS$LONGFORMER_PROJECT} /></dt>
          <dd>{detail.projectName}</dd>
        </div>
        <div className="arco-longformer-details__row">
          <dt><T k={I18nKey.APPS$LONGFORMER_STATUS} /></dt>
          <dd>{detail.status}</dd>
        </div>
        <div className="arco-longformer-details__row">
          <dt><T k={I18nKey.APPS$LONGFORMER_DURATION} /></dt>
          <dd>{formatDuration(detail.durationMs)}</dd>
        </div>
        <div className="arco-longformer-details__row">
          <dt><T k={I18nKey.APPS$LONGFORMER_LANGUAGE} /></dt>
          <dd>{detail.language}</dd>
        </div>
        {media ? (
          <>
            <div className="arco-longformer-details__row">
              <dt><T k={I18nKey.APPS$LONGFORMER_FILE} /></dt>
              <dd>
                {media.name}.{media.extension}
              </dd>
            </div>
            <div className="arco-longformer-details__row">
              <dt><T k={I18nKey.APPS$LONGFORMER_KIND} /></dt>
              <dd>{media.kind}</dd>
            </div>
          </>
        ) : null}
        {job?.engine ? (
          <div className="arco-longformer-details__row">
            <dt><T k={I18nKey.APPS$LONGFORMER_STT_ENGINE} /></dt>
            <dd>{job.engine}</dd>
          </div>
        ) : null}
        {job?.createdAt ? (
          <div className="arco-longformer-details__row">
            <dt><T k={I18nKey.APPS$LONGFORMER_CREATED} /></dt>
            <dd>{new Date(job.createdAt).toLocaleString()}</dd>
          </div>
        ) : null}
      </dl>
    </ArtifactPageLayout>
  );
}
