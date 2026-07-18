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
import { ListSearch, ModuleFilterSelect } from "../../components/patterns";
import { LongformerUploadMenu } from "./LongformerUploadMenu";
import { filterTranscripts, formatDuration } from "./types";
import type { LongformerViewModel } from "./longformerStore";
import type {
  TranscriptDateRange,
  TranscriptMetric,
  TranscriptSourceType,
  TranscriptStatus,
  TranscriptSummary,
} from "./types";

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

const SOURCE_LABEL: Record<TranscriptSourceType, string> = {
  call: "Call",
  meeting: "Meeting",
  podcast: "Podcast",
  upload: "Upload",
  recording: "Recording",
  memory: "Memory",
  broadcast: "Broadcast",
};

const DATE_RANGE_OPTIONS: { value: TranscriptDateRange; label: string }[] = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "all", label: "All time" },
];

const SOURCE_OPTIONS: { value: TranscriptSourceType | "all"; label: string }[] = [
  { value: "all", label: "All sources" },
  ...(Object.keys(SOURCE_LABEL) as TranscriptSourceType[]).map((value) => ({
    value,
    label: SOURCE_LABEL[value],
  })),
];

const STATUS_OPTIONS: { value: TranscriptStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  ...(Object.keys(STATUS_LABEL) as TranscriptStatus[]).map((value) => ({
    value,
    label: STATUS_LABEL[value],
  })),
];

interface LongformerLibraryViewProps {
  vm: LongformerViewModel;
}

function MetricCard({
  metric,
  active,
  onSelect,
}: {
  metric: TranscriptMetric;
  active?: boolean;
  onSelect: () => void;
}) {
  const trend = metric.trend;
  const trendUp = trend != null && trend >= 0;
  return (
    <button
      type="button"
      className={`arco-longformer-metric${active ? " arco-longformer-metric--active" : ""}`}
      onClick={onSelect}
      aria-pressed={active}
    >
      <span className="arco-longformer-metric__label">{metric.label}</span>
      <div className="arco-longformer-metric__row">
        <span className="arco-longformer-metric__value">{metric.value}</span>
        {trend != null ? (
          <span
            className={`arco-longformer-metric__trend ${
              trendUp ? "arco-longformer-metric__trend--up" : "arco-longformer-metric__trend--down"
            }`}
          >
            {trendUp ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        ) : null}
      </div>
    </button>
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
  const [dateRange, setDateRange] = useState<TranscriptDateRange>("30d");
  const [languageFilter, setLanguageFilter] = useState<string | "all">("all");
  const {
    data,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    openTranscript,
    uploadFile,
    openDrivePicker,
    uploading,
  } = vm;

  const languageOptions = useMemo(() => {
    const languages = [...new Set(data.transcripts.map((t) => t.language).filter(Boolean) as string[])].sort();
    return [
      { value: "all" as const, label: i18n.t(I18nKey.APPS$LONGFORMER_LANGUAGE) },
      ...languages.map((language) => ({ value: language, label: language })),
    ];
  }, [data.transcripts]);

  const visibleTranscripts = useMemo(
    () =>
      filterTranscripts(data.transcripts, {
        status: statusFilter,
        sourceType: sourceFilter,
        dateRange,
        language: languageFilter,
        query: vm.searchQuery,
      }),
    [data.transcripts, statusFilter, sourceFilter, dateRange, languageFilter, vm.searchQuery],
  );

  return (
    <div className="arco-longformer-library">
      <header className="arco-longformer-library__header">
        <h1 className="arco-longformer-library__title"><T k={I18nKey.APPS$LONGFORMER_LIBRARY} /></h1>
        <div className="arco-longformer-library__actions">
          <LongformerUploadMenu
            label={i18n.t(I18nKey.APPS$LONGFORMER_UPLOAD)}
            icon={Upload}
            variant="primary"
            disabled={uploading}
            onPickLocal={uploadFile}
            onPickDrive={openDrivePicker}
          />
        </div>
      </header>

      <div className="arco-longformer-library__metrics">
        {data.metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            active={
              metric.id === "sources"
                ? false
                : metric.id === "total"
                  ? statusFilter === "all"
                  : statusFilter === metric.status
            }
            onSelect={() => {
              if (metric.id === "sources") {
                vm.setView("sources");
                return;
              }
              if (metric.id === "total") {
                setStatusFilter("all");
                return;
              }
              if (metric.status === "ready" || metric.status === "processing" || metric.status === "queued") {
                setStatusFilter((prev) => (prev === metric.status ? "all" : metric.status));
              }
            }}
          />
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
        <ModuleFilterSelect
          label={i18n.t(I18nKey.APPS$LONGFORMER_LAST_30_DAYS)}
          value={dateRange}
          options={DATE_RANGE_OPTIONS}
          onChange={setDateRange}
        />
        <ModuleFilterSelect
          label={i18n.t(I18nKey.APPS$LONGFORMER_SOURCE)}
          value={sourceFilter}
          options={SOURCE_OPTIONS}
          onChange={setSourceFilter}
        />
        <ModuleFilterSelect
          label={i18n.t(I18nKey.APPS$LONGFORMER_STATUS)}
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={setStatusFilter}
        />
        <ModuleFilterSelect
          label={i18n.t(I18nKey.APPS$LONGFORMER_LANGUAGE)}
          value={languageFilter}
          options={languageOptions}
          onChange={setLanguageFilter}
        />
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
