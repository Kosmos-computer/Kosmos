import type { ReactNode } from "react";
import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
import { FileAudio, Headphones, Loader2, Mic, Phone, Upload, Users, Video } from "lucide-react";
import { Button } from "../../components/ui";
import { filterTranscripts, formatDuration } from "./types";
import type { LongformerViewModel } from "./longformerStore";
import type { TranscriptSourceType, TranscriptStatus, TranscriptSummary } from "./types";

const SOURCE_ICON: Record<TranscriptSourceType, typeof Mic> = {
  call: Phone,
  meeting: Users,
  podcast: Headphones,
  upload: Upload,
  recording: Video,
  memory: FileAudio,
  broadcast: Headphones,
};

const STATUS_LABEL: Record<TranscriptStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};

interface LongformerJobListViewProps {
  vm: LongformerViewModel;
  title: string;
  description: string;
  statuses?: TranscriptStatus[];
  sourceType?: TranscriptSourceType;
  emptyLabel: string;
  actions?: ReactNode;
}

function JobRow({
  transcript,
  onOpen,
}: {
  transcript: TranscriptSummary;
  onOpen: (id: string) => void;
}) {
  const SourceIcon = SOURCE_ICON[transcript.sourceType];
  return (
    <tr className="arco-longformer-table__row" onClick={() => onOpen(transcript.id)}>
      <td>
        <span className="arco-longformer-table__title">{transcript.title}</span>
      </td>
      <td>
        <span className="arco-longformer-table__source">
          <SourceIcon size={14} strokeWidth={1.75} />
          {transcript.sourceLabel}
        </span>
      </td>
      <td>
        <span className={`arco-longformer-status arco-longformer-status--${transcript.status}`}>
          {transcript.status === "processing" ? <Loader2 size={12} className="arco-longformer-status__spin" /> : null}
          {STATUS_LABEL[transcript.status]}
        </span>
      </td>
      <td>
        <span className="arco-longformer-table__meta">{formatDuration(transcript.durationMs)}</span>
      </td>
      <td>
        <span className="arco-longformer-table__meta">{transcript.createdAt}</span>
      </td>
    </tr>
  );
}

/** Filtered job table for In Progress / Uploads (and similar queue views). */
export function LongformerJobListView({
  vm,
  title,
  description,
  statuses,
  sourceType,
  emptyLabel,
  actions,
}: LongformerJobListViewProps) {
  const rows = filterTranscripts(vm.data.transcripts, {
    sourceType: sourceType ?? "all",
    query: vm.searchQuery,
  }).filter((job) => !statuses || statuses.includes(job.status));

  return (
    <div className="arco-longformer-library">
      <header className="arco-longformer-library__header">
        <div>
          <h1 className="arco-longformer-library__title">{title}</h1>
          <p className="arco-longformer-placeholder__text">{description}</p>
        </div>
        {actions ? <div className="arco-longformer-library__actions">{actions}</div> : null}
      </header>

      <div className="arco-longformer-table-card">
        <div className="arco-longformer-table-wrap">
          <table className="arco-longformer-table">
            <thead>
              <tr>
                <th scope="col"><T k={I18nKey.APPS$LONGFORMER_TITLE} /></th>
                <th scope="col"><T k={I18nKey.APPS$LONGFORMER_SOURCE} /></th>
                <th scope="col"><T k={I18nKey.APPS$LONGFORMER_STATUS} /></th>
                <th scope="col"><T k={I18nKey.APPS$LONGFORMER_DURATION} /></th>
                <th scope="col"><T k={I18nKey.APPS$LONGFORMER_CREATED} /></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="arco-longformer-table__empty">
                    {emptyLabel}
                  </td>
                </tr>
              ) : (
                rows.map((transcript) => (
                  <JobRow key={transcript.id} transcript={transcript} onOpen={vm.openTranscript} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function LongformerUploadsActions({ vm }: { vm: LongformerViewModel }) {
  return (
    <>
      <Button type="button" variant="default" disabled={vm.uploading} onClick={vm.openDrivePicker}>
        From Files
      </Button>
      <Button type="button" variant="primary" disabled={vm.uploading} onClick={vm.uploadFile}>
        <Upload size={14} strokeWidth={1.75} />
        From this computer
      </Button>
    </>
  );
}
