import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useMemo, useState } from "react";
import {
  FileAudio,
  Headphones,
  Loader2,
  Mic,
  MoreHorizontal,
  Phone,
  Upload,
  Users,
  Video,
} from "lucide-react";
import { Button } from "../../components/ui";
import { ListSearch } from "../../components/patterns";
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

interface LongformerLibraryViewProps {
  vm: LongformerViewModel;
}

function MetricCard({ label, value, trend }: { label: string; value: number; trend: number }) {
  const trendUp = trend >= 0;
  return (
    <div className="arco-longformer-metric">
      <span className="arco-longformer-metric__label">{label}</span>
      <div className="arco-longformer-metric__row">
        <span className="arco-longformer-metric__value">{value}</span>
        <span className={`arco-longformer-metric__trend ${trendUp ? "arco-longformer-metric__trend--up" : "arco-longformer-metric__trend--down"}`}>
          {trendUp ? "↑" : "↓"} {Math.abs(trend)}%
        </span>
      </div>
    </div>
  );
}

function TranscriptRow({
  transcript,
  onOpen,
}: {
  transcript: TranscriptSummary;
  onOpen: (id: string) => void;
}) {
  const SourceIcon = SOURCE_ICON[transcript.sourceType];
  return (
    <tr className="arco-longformer-table__row" onClick={() => onOpen(transcript.id)}>
      <td className="arco-longformer-table__check" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" aria-label={`Select ${transcript.title}`} />
      </td>
      <td>
        <div className="arco-longformer-table__title-cell">
          <span className="arco-longformer-table__title">{transcript.title}</span>
          {transcript.projectName ? (
            <span className="arco-longformer-table__project">{transcript.projectName}</span>
          ) : null}
          {transcript.excerpt ? <span className="arco-longformer-table__excerpt">{transcript.excerpt}</span> : null}
        </div>
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
        <span className="arco-longformer-table__meta">
          {transcript.wordCount ? `${transcript.wordCount.toLocaleString()} words` : "—"}
        </span>
      </td>
      <td>
        <span className="arco-longformer-table__meta">{transcript.createdAt}</span>
      </td>
      <td className="arco-longformer-table__actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="arco-longformer-table__action-btn" aria-label={`Actions for ${transcript.title}`}>
          <MoreHorizontal size={16} />
        </button>
      </td>
    </tr>
  );
}

/** Transcript library — KPI summary, filters, and searchable transcript table. */
export function LongformerLibraryView({ vm }: LongformerLibraryViewProps) {
  const [showProcessingBanner, setShowProcessingBanner] = useState(true);
  const { data, statusFilter, setStatusFilter, sourceFilter, setSourceFilter, openTranscript, uploadFile, openDemoProject } = vm;

  const visibleTranscripts = useMemo(
    () =>
      filterTranscripts(data.transcripts, {
        status: statusFilter,
        sourceType: sourceFilter,
        query: vm.searchQuery,
      }),
    [data.transcripts, statusFilter, sourceFilter, vm.searchQuery],
  );

  return (
    <div className="arco-longformer-library">
      <header className="arco-longformer-library__header">
        <h1 className="arco-longformer-library__title"><T k={I18nKey.APPS$LONGFORMER_LIBRARY} /></h1>
        <div className="arco-longformer-library__actions">
          <Button type="button" variant="default"><T k={I18nKey.APPS$LONGFORMER_EXPORT_ALL} /></Button>
          <Button type="button" variant="primary" onClick={uploadFile}>
            <Upload size={14} strokeWidth={1.75} /><T k={I18nKey.APPS$LONGFORMER_UPLOAD} /></Button>
        </div>
      </header>

      <div className="arco-longformer-library__metrics">
        {data.metrics.map((metric) => (
          <MetricCard key={metric.id} label={metric.label} value={metric.value} trend={metric.trend} />
        ))}
      </div>

      <div className="arco-longformer-library__filters">
        <ListSearch
          value={vm.searchQuery}
          onChange={vm.setSearchQuery}
          placeholder={i18n.t(I18nKey.APPS$LONGFORMER_SEARCH_TRANSCRIPTS)}
          ariaLabel="Search transcripts"
          className="arco-longformer-library__search"
        />
        <button type="button" className="arco-longformer-filter-btn"><T k={I18nKey.APPS$LONGFORMER_LAST_30_DAYS} /></button>
        <button
          type="button"
          className="arco-longformer-filter-btn"
          onClick={() =>
            setSourceFilter((prev) =>
              prev === "all" ? "meeting" : prev === "meeting" ? "call" : prev === "call" ? "podcast" : prev === "podcast" ? "upload" : prev === "upload" ? "memory" : "all",
            )
          }
        ><T k={I18nKey.APPS$LONGFORMER_SOURCE} />{sourceFilter !== "all" ? `: ${sourceFilter}` : ""}
        </button>
        <button
          type="button"
          className="arco-longformer-filter-btn"
          onClick={() =>
            setStatusFilter((prev) =>
              prev === "all" ? "ready" : prev === "ready" ? "processing" : prev === "processing" ? "queued" : prev === "queued" ? "failed" : "all",
            )
          }
        ><T k={I18nKey.APPS$LONGFORMER_STATUS} />{statusFilter !== "all" ? `: ${statusFilter}` : ""}
        </button>
        <button type="button" className="arco-longformer-filter-btn"><T k={I18nKey.APPS$LONGFORMER_LANGUAGE} /></button>
      </div>

      {showProcessingBanner && data.processingCount > 0 ? (
        <div className="arco-longformer-banner" role="status">
          <p>
            {data.processingCount}<T k={I18nKey.APPS$LONGFORMER_TRANSCRIPT} />{data.processingCount === 1 ? "" : "s"}<T k={I18nKey.APPS$LONGFORMER_CURRENTLY_PROCESSING} /></p>
          <div className="arco-longformer-banner__actions">
            <Button type="button" variant="ghost" onClick={() => setShowProcessingBanner(false)}><T k={I18nKey.APPS$LONGFORMER_DISMISS} /></Button>
            <Button type="button" variant="default" onClick={() => vm.setView("in-progress")}><T k={I18nKey.APPS$LONGFORMER_VIEW_QUEUE} /></Button>
          </div>
        </div>
      ) : null}

      <div className="arco-longformer-library__demo">
        <button type="button" className="arco-longformer-demo-card" onClick={openDemoProject}>
          <span className="arco-longformer-demo-card__eyebrow"><T k={I18nKey.APPS$LONGFORMER_FEATURED_DEMO} /></span>
          <span className="arco-longformer-demo-card__title"><T k={I18nKey.APPS$LONGFORMER_BEACHCUBE_DEMO_PROJECT_PODCAST} /></span>
          <span className="arco-longformer-demo-card__meta"><T k={I18nKey.APPS$LONGFORMER_2_SPEAKERS_CHAPTERS_CLIPS_TIMELINE_EDITOR} /></span>
        </button>
      </div>

      <div className="arco-longformer-table-card">
        <div className="arco-longformer-table-wrap">
          <table className="arco-longformer-table">
            <thead>
              <tr>
                <th scope="col" className="arco-longformer-table__check">
                  <input type="checkbox" aria-label={i18n.t(I18nKey.APPS$LONGFORMER_SELECT_ALL_TRANSCRIPTS)} />
                </th>
                <th scope="col"><T k={I18nKey.APPS$LONGFORMER_TITLE} /></th>
                <th scope="col"><T k={I18nKey.APPS$LONGFORMER_SOURCE} /></th>
                <th scope="col"><T k={I18nKey.APPS$LONGFORMER_STATUS} /></th>
                <th scope="col"><T k={I18nKey.APPS$LONGFORMER_DURATION} /></th>
                <th scope="col"><T k={I18nKey.APPS$LONGFORMER_WORDS} /></th>
                <th scope="col"><T k={I18nKey.APPS$LONGFORMER_CREATED} /></th>
                <th scope="col" className="arco-longformer-table__actions" aria-label={i18n.t(I18nKey.APPS$LONGFORMER_ACTIONS)} />
              </tr>
            </thead>
            <tbody>
              {visibleTranscripts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="arco-longformer-table__empty"><T k={I18nKey.APPS$LONGFORMER_NO_TRANSCRIPTS_MATCH_THE_CURRENT_FILTERS} /></td>
                </tr>
              ) : (
                visibleTranscripts.map((transcript) => (
                  <TranscriptRow key={transcript.id} transcript={transcript} onOpen={openTranscript} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
