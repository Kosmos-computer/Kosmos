import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Captions,
  ChevronLeft,
  Download,
  ExternalLink,
  HardDriveDownload,
  Headphones,
  Home,
  Layers,
  Library,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { ConnectServiceModal, MediaPlayerBar, ListItem, NavSidebar, NavSidebarSectionHeader } from "../../components/patterns";
import { Button, Chip, EmptyState, Input } from "../../components/ui";
import { useConnectionStore } from "../../connections/useConnectionStore";
import { PodcastCover } from "./PodcastCover";
import { PodcastDirectory, PodcastDirectoryShowDetail } from "./PodcastDirectory";
import { PodcastMainFeed } from "./PodcastMainFeed";
import { PODCAST_PROVIDERS, episodeBelongsToShow, isPlayableEpisode } from "./podcastCatalog";
import type { PodcastContentFilter, PodcastEpisode, PodcastEpisodeDetailTab, PodcastNavSection, PodcastShow } from "./types";
import type { PodcastViewModel } from "./usePodcast";

const NAV_ITEMS: { id: PodcastNavSection; label: string; icon: typeof Home }[] = [
  { id: "main-feed", label: "Main Feed", icon: Layers },
  { id: "home", label: "Home", icon: Home },
  { id: "browse", label: "Browse", icon: BookOpen },
  { id: "library", label: "Library", icon: Library },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "transcripts", label: "Transcripts", icon: Captions },
];

const CONTENT_FILTERS: { id: PodcastContentFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "podcasts", label: "Podcasts" },
  { id: "audiobooks", label: "Audiobooks" },
];

export interface PodcastSidebarProps {
  vm: PodcastViewModel;
  connectOpen: boolean;
  onOpenConnect: () => void;
  onCloseConnect: () => void;
}

export function PodcastSidebar({ vm, connectOpen, onOpenConnect, onCloseConnect }: PodcastSidebarProps) {
  const { t } = useTranslation();
  const connections = useConnectionStore((s) => s.connections);
  const addConnection = useConnectionStore((s) => s.addConnection);
  const podcastConnections = connections.filter((c) => c.domain === "podcast");

  return (
    <>
      <aside className="arco-podcast__library" aria-label={i18n.t(I18nKey.APPS$PODCAST_PODCASTS_AND_AUDIOBOOKS)}>
        <NavSidebar
          className="arco-podcast-library-nav"
          header={
            <>
              <div className="arco-podcast-library-nav__header">
                <Headphones size={20} aria-hidden="true" />
                <h2 className="arco-podcast-library-nav__title"><T k={I18nKey.APPS$PODCAST_LISTEN} /></h2>
              </div>
              <label className="arco-podcast-library-nav__search">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  placeholder={i18n.t(I18nKey.APPS$PODCAST_SEARCH_SHOWS_AND_EPISODES)}
                  value={vm.searchQuery}
                  onChange={(event) => vm.setSearchQuery(event.target.value)}
                  aria-label={i18n.t(I18nKey.APPS$PODCAST_SEARCH_PODCASTS)}
                />
              </label>
            </>
          }
          sections={[]}
          scrollContent={
            <div className="arco-nav-sidebar__sections">
              <div>
                <NavSidebarSectionHeader title={i18n.t(I18nKey.APPS$PODCAST_BROWSE)} />
                <div className="arco-nav-sidebar__section-items">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <ListItem
                        key={item.id}
                        className="arco-nav-sidebar__nav-item"
                        leading={<Icon size={18} />}
                        label={item.label}
                        description={
                          item.id === "transcripts"
                            ? vm.processingTranscriptCount > 0
                              ? `${vm.processingTranscriptCount} processing · ${Object.keys(vm.transcriptIndex).length} saved`
                              : Object.keys(vm.transcriptIndex).length > 0
                                ? `${Object.keys(vm.transcriptIndex).length} saved`
                                : undefined
                            : undefined
                        }
                        active={vm.navSection === item.id}
                        onClick={() => vm.setNavSection(item.id)}
                      />
                    );
                  })}
                </div>
              </div>

              <div>
                <NavSidebarSectionHeader title={i18n.t(I18nKey.APPS$PODCAST_SOURCES)} />
                <div className="arco-nav-sidebar__section-items">
                  <ListItem
                    className="arco-nav-sidebar__nav-item"
                    label={i18n.t(I18nKey.APPS$PODCAST_LOCAL_LIBRARY)}
                    active={vm.sourceFilter === "local"}
                    onClick={() => {
                      if (vm.navSection === "settings") vm.setNavSection("browse");
                      vm.setSourceFilter("local");
                    }}
                  />
                  <ListItem
                    className="arco-nav-sidebar__nav-item"
                    label={i18n.t(I18nKey.APPS$PODCAST_RSS_FEEDS)}
                    active={vm.sourceFilter === "rss"}
                    onClick={() => {
                      if (vm.navSection === "settings") vm.setNavSection("browse");
                      vm.setSourceFilter("rss");
                    }}
                  />
                  {PODCAST_PROVIDERS.map((provider) => {
                    const connected = podcastConnections.some((c) => c.provider === provider.id);
                    return (
                      <ListItem
                        key={provider.id}
                        className="arco-nav-sidebar__nav-item"
                        leading={
                          <span
                            className="arco-podcast__provider-badge"
                            style={{ ["--podcast-accent" as string]: provider.accent }}
                          >
                            {provider.initials}
                          </span>
                        }
                        label={provider.label}
                        description={connected ? "Connected" : "Not connected"}
                        active={vm.sourceFilter === "remote" && vm.activeProviderId === provider.id}
                        onClick={() => {
                          if (vm.navSection === "settings") vm.setNavSection("browse");
                          vm.setSourceFilter("remote");
                          vm.setActiveProviderId(provider.id);
                        }}
                      />
                    );
                  })}
                  <ListItem
                    className="arco-nav-sidebar__nav-item"
                    leading={<Plus size={16} />}
                    label={i18n.t(I18nKey.APPS$SOCIAL_CONNECT_ACCOUNT)}
                    onClick={onOpenConnect}
                  />
                </div>
              </div>

              <div>
                <NavSidebarSectionHeader title={i18n.t(I18nKey.APPS$PODCAST_MANAGE)} />
                <div className="arco-nav-sidebar__section-items">
                  <ListItem
                    className="arco-nav-sidebar__nav-item"
                    leading={<Settings size={18} />}
                    label={i18n.t(I18nKey.OS$APP_SETTINGS)}
                    active={vm.navSection === "settings"}
                    onClick={() => vm.setNavSection("settings")}
                  />
                </div>
              </div>
            </div>
          }
        />
      </aside>

      <ConnectServiceModal
        open={connectOpen}
        onClose={onCloseConnect}
        domain="podcast"
        existingConnections={connections}
        initialProvider={vm.activeProviderId}
        onConnect={(input) => {
          const connection = addConnection(input);
          if (input.token) vm.setConnectionToken(connection.id, input.token);
          void vm.refreshRemote(useConnectionStore.getState().connections);
        }}
        onSelectExisting={(connection) => {
          vm.setActiveProviderId(connection.provider as "spotify" | "apple-podcasts" | "audible");
          vm.setSourceFilter("remote");
          void vm.refreshRemote(useConnectionStore.getState().connections);
        }}
      />
    </>
  );
}

function EpisodeRow({
  episode,
  active,
  onPlay,
  onSaveToDrive,
  savedToDrive,
  savingToDrive,
  canSaveToDrive,
  onTranscribe,
  onOpenTranscript,
  hasTranscript,
  transcribing,
  canTranscribe,
}: {
  episode: PodcastEpisode;
  active: boolean;
  onPlay: () => void;
  onSaveToDrive?: () => void;
  savedToDrive?: boolean;
  savingToDrive?: boolean;
  canSaveToDrive?: boolean;
  onTranscribe?: () => void;
  onOpenTranscript?: () => void;
  hasTranscript?: boolean;
  transcribing?: boolean;
  canTranscribe?: boolean;
}) {
  return (
    <div className={`arco-podcast__episode-row${active ? " arco-podcast__episode-row--active" : ""}`}>
      <button type="button" className="arco-podcast__episode-play" onClick={onPlay}>
        <PodcastCover
          episodeId={episode.id}
          tone={episode.artTone}
          coverUrl={episode.coverUrl}
          size="sm"
          alt={episode.title}
        />
        <div className="arco-podcast__episode-meta">
          <strong>{episode.title}</strong>
          <span>
            {episode.showTitle} · {episode.host}
          </span>
        </div>
        <span className="arco-podcast__episode-duration">{episode.durationLabel}</span>
        {episode.kind === "audiobook" ? (
          <span className="arco-podcast__episode-tag"><T k={I18nKey.APPS$PODCAST_AUDIOBOOK} /></span>
        ) : null}
      </button>
      <div className="arco-podcast__episode-actions">
        {canTranscribe ? (
          <button
            type="button"
            className={`arco-podcast__icon-btn arco-podcast__transcript-btn${hasTranscript ? " arco-podcast__transcript-btn--saved" : ""}`}
            aria-label={hasTranscript ? "View transcript" : "Transcribe episode"}
            title={hasTranscript ? "View transcript" : transcribing ? "Transcribing…" : "Transcribe"}
            disabled={transcribing}
            onClick={(event) => {
              event.stopPropagation();
              if (hasTranscript) onOpenTranscript?.();
              else onTranscribe?.();
            }}
          >
            {transcribing ? <Loader2 size={16} className="arco-podcast__spin" /> : <Captions size={16} />}
          </button>
        ) : null}
        {canSaveToDrive ? (
          <button
            type="button"
            className={`arco-podcast__icon-btn arco-podcast__drive-btn${savedToDrive ? " arco-podcast__drive-btn--saved" : ""}`}
            aria-label={savedToDrive ? "Saved to Drive" : "Save to Drive"}
            title={savedToDrive ? "Saved to Drive" : "Save to Drive"}
            disabled={savingToDrive || savedToDrive}
            onClick={(event) => {
              event.stopPropagation();
              onSaveToDrive?.();
            }}
          >
            <HardDriveDownload size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function episodeRowProps(vm: PodcastViewModel, episode: PodcastEpisode) {
  const canSaveToDrive = isPlayableEpisode(episode);
  const canTranscribe = isPlayableEpisode(episode);
  return {
    episode,
    active: vm.activeEpisodeId === episode.id,
    onPlay: () => vm.playEpisode(episode.id, isPlayableEpisode(episode)),
    canSaveToDrive,
    savedToDrive: Boolean(vm.driveSavedIds[episode.id]),
    savingToDrive: Boolean(vm.driveSavingIds[episode.id]),
    onSaveToDrive: canSaveToDrive ? () => void vm.saveEpisodeToDrive(episode.id) : undefined,
    canTranscribe,
    hasTranscript: Boolean(vm.transcriptIndex[episode.id]),
    transcribing: Boolean(vm.transcribingIds[episode.id]),
    onTranscribe: canTranscribe ? () => void vm.transcribeEpisode(episode.id) : undefined,
    onOpenTranscript: canTranscribe ? () => void vm.openTranscript(episode.id) : undefined,
  };
}

function transcriptEngineLabel(engine: "openai-whisper" | "voice-server"): string {
  return engine === "openai-whisper" ? "OpenAI Whisper" : "Voice server";
}

function PodcastEpisodeDetail({ vm }: PodcastHomeContentProps) {
  const episodeId = vm.selectedEpisodeId;
  if (!episodeId) return null;

  const episode = vm.activeEpisode;
  const summary = vm.transcriptIndex[episodeId];
  const transcript = vm.activeTranscript;
  const title = episode?.title ?? summary?.title ?? "Episode";
  const showTitle = episode?.showTitle ?? summary?.showTitle ?? "";
  const host = episode?.host ?? "";
  const hasTranscript = Boolean(summary);
  const transcribing = Boolean(vm.transcribingIds[episodeId]);
  const canTranscribe = episode ? isPlayableEpisode(episode) : false;
  const tab = vm.episodeDetailTab;

  return (
    <main className="arco-podcast__main">
      <div className="arco-podcast__main-scroll arco-podcast__scrollable">
        <button
          type="button"
          className="arco-podcast__back-btn"
          onClick={() => vm.closeEpisodeDetail()}
          aria-label={i18n.t(I18nKey.COMMON$BACK)}
        >
          <ChevronLeft size={18} strokeWidth={1.75} /><T k={I18nKey.COMMON$BACK} /></button>

        <section className="arco-podcast__show-hero">
          <PodcastCover
            episodeId={episode?.id ?? episodeId}
            tone={episode?.artTone ?? "teal"}
            coverUrl={episode?.coverUrl}
            size="lg"
            alt={title}
          />
          <div className="arco-podcast__show-hero-copy">
            <span className="arco-podcast__featured-label">
              {episode?.kind === "audiobook" ? "Audiobook" : "Episode"}
            </span>
            <h1>{title}</h1>
            <p>
              {showTitle}
              {host ? ` · ${host}` : ""}
              {episode?.durationLabel ? ` · ${episode.durationLabel}` : ""}
            </p>
            {episode && isPlayableEpisode(episode) ? (
              <button type="button" className="arco-podcast__play-btn" onClick={() => vm.playEpisode(episode.id, true)}>
                <Play size={18} /><T k={I18nKey.APPS$PODCAST_PLAY} /></button>
            ) : null}
          </div>
        </section>

        <div className="arco-podcast__detail-tabs" role="tablist" aria-label={i18n.t(I18nKey.APPS$PODCAST_EPISODE_VIEWS)}>
          {(
            [
              { id: "episode" as PodcastEpisodeDetailTab, label: "Episode" },
              { id: "transcript" as PodcastEpisodeDetailTab, label: "Transcript" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`arco-podcast__detail-tab${tab === item.id ? " arco-podcast__detail-tab--active" : ""}`}
              disabled={item.id === "transcript" && !hasTranscript && !transcribing}
              onClick={() => void vm.setEpisodeDetailTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "episode" ? (
          <section className="arco-podcast__section arco-podcast__episode-detail-panel">
            <h2 className="arco-podcast__section-title"><T k={I18nKey.APPS$PODCAST_ABOUT_THIS_EPISODE} /></h2>
            {summary?.textPreview ? (
              <p className="arco-podcast__episode-detail-preview">{summary.textPreview}</p>
            ) : (
              <p className="arco-podcast__downloads-hint"><T k={I18nKey.APPS$PODCAST_NO_TRANSCRIPT_GENERATED_YET} /></p>
            )}
            <div className="arco-podcast__episode-detail-actions">
              {canTranscribe ? (
                <Button
                  variant="primary"
                  disabled={transcribing}
                  onClick={() => {
                    if (hasTranscript) void vm.openEpisodeDetail(episodeId, "transcript");
                    else void vm.transcribeEpisode(episodeId);
                  }}
                >
                  {transcribing ? (
                    <>
                      <Loader2 size={16} className="arco-podcast__spin" /><T k={I18nKey.APPS$PODCAST_TRANSCRIBING} /></>
                  ) : hasTranscript ? (
                    <>
                      <Captions size={16} /><T k={I18nKey.APPS$PODCAST_VIEW_TRANSCRIPT} /></>
                  ) : (
                    <>
                      <Captions size={16} /><T k={I18nKey.APPS$PODCAST_TRANSCRIBE} /></>
                  )}
                </Button>
              ) : null}
              {episode && isPlayableEpisode(episode) ? (
                <Button
                  variant="ghost"
                  disabled={Boolean(vm.driveSavingIds[episode.id]) || Boolean(vm.driveSavedIds[episode.id])}
                  onClick={() => void vm.saveEpisodeToDrive(episode.id)}
                >
                  <HardDriveDownload size={16} />
                  {vm.driveSavedIds[episode.id] ? "Saved to Drive" : "Save to Drive"}
                </Button>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="arco-podcast__section arco-podcast__episode-detail-panel">
            {transcribing ? (
              <EmptyState title={i18n.t(I18nKey.APPS$PODCAST_TRANSCRIBING)}><T k={I18nKey.APPS$PODCAST_THIS_MAY_TAKE_A_MINUTE_FOR_LONGER_EPISODES} /></EmptyState>
            ) : transcript ? (
              <>
                <p className="arco-podcast__episode-detail-meta">
                  {transcript.wordCount.toLocaleString()}<T k={I18nKey.APPS$PODCAST_WORDS} />{transcriptEngineLabel(transcript.engine)} ·{" "}
                  {formatTranscriptDate(transcript.createdAt)}
                </p>
                <div className="arco-podcast__detail-transcript">{transcript.text}</div>
                <p className="arco-podcast__episode-detail-footnote"><T k={I18nKey.APPS$PODCAST_SAVED_TO_DATA_PODCAST_TRANSCRIPTS} />{transcript.episodeId}<T k={I18nKey.APPS$PODCAST_TXT} /></p>
              </>
            ) : (
              <EmptyState title={i18n.t(I18nKey.APPS$PODCAST_TRANSCRIPT_UNAVAILABLE)}>
                {canTranscribe ? (
                  <Button variant="primary" onClick={() => void vm.transcribeEpisode(episodeId)}>
                    <Captions size={16} /><T k={I18nKey.APPS$PODCAST_TRANSCRIBE_EPISODE} /></Button>
                ) : (
                  "This episode cannot be transcribed."
                )}
              </EmptyState>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function formatTranscriptDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function PodcastTranscriptsContent({ vm }: PodcastHomeContentProps) {
  const savedCount = Object.keys(vm.transcriptIndex).length;
  const processingCount = vm.processingTranscriptCount;

  const subtitle =
    processingCount > 0 && savedCount > 0
      ? `${processingCount} processing · ${savedCount} saved`
      : processingCount > 0
        ? `${processingCount} processing`
        : savedCount === 0
          ? "Episode transcripts you generate appear here"
          : `${savedCount} saved transcript${savedCount === 1 ? "" : "s"}`;

  return (
    <main className="arco-podcast__main">
      <div className="arco-podcast__main-scroll arco-podcast__scrollable">
        {vm.error ? <p className="arco-podcast__feed-error">{vm.error}</p> : null}

        <header className="arco-podcast__directory-header">
          <div>
            <h1 className="arco-podcast__directory-title"><T k={I18nKey.APPS$PODCAST_TRANSCRIPTS} /></h1>
            <p className="arco-podcast__directory-subtitle">{subtitle}</p>
          </div>
        </header>

        {vm.transcriptEntries.length === 0 ? (
          <EmptyState title={savedCount === 0 && processingCount === 0 ? "No transcripts yet" : "No matching transcripts"}>
            {savedCount === 0 && processingCount === 0 ? (
              <><T k={I18nKey.APPS$PODCAST_TRANSCRIBE_ANY_PLAYABLE_EPISODE_FROM_LIBRARY_THEN_RETURN} /><Button variant="primary" onClick={() => vm.setNavSection("library")}><T k={I18nKey.APPS$PODCAST_GO_TO_LIBRARY} /></Button>
              </>
            ) : (
              <><T k={I18nKey.APPS$PODCAST_TRY_A_DIFFERENT_SEARCH_TERM} /></>
            )}
          </EmptyState>
        ) : (
          <section className="arco-podcast__section">
            <div className="arco-podcast__transcript-list">
              {vm.transcriptEntries.map((entry) => {
                if (entry.status === "processing") {
                  const episode = vm.episodeForTranscript(entry.episodeId);
                  return (
                    <button
                      key={entry.episodeId}
                      type="button"
                      className="arco-podcast__transcript-row arco-podcast__transcript-row--processing"
                      onClick={() => void vm.openEpisodeDetail(entry.episodeId, "transcript", "transcripts")}
                    >
                      {episode ? (
                        <PodcastCover
                          episodeId={episode.id}
                          tone={episode.artTone}
                          coverUrl={episode.coverUrl}
                          size="sm"
                          alt={entry.title}
                        />
                      ) : (
                        <span className="arco-podcast__transcript-row-icon" aria-hidden="true">
                          <Captions size={18} />
                        </span>
                      )}
                      <span className="arco-podcast__transcript-row-copy">
                        <strong>{entry.title}</strong>
                        <span>{entry.showTitle}</span>
                        <span className="arco-podcast__transcript-row-preview"><T k={I18nKey.APPS$PODCAST_TRANSCRIPTION_IN_PROGRESS} /></span>
                      </span>
                      <span className="arco-podcast__transcript-row-status">
                        <Loader2 size={16} className="arco-podcast__spin" /><T k={I18nKey.APPS$PODCAST_PROCESSING} /></span>
                    </button>
                  );
                }

                const episode = vm.episodeForTranscript(entry.episodeId);
                const engineLabel = transcriptEngineLabel(entry.engine);
                return (
                  <button
                    key={entry.episodeId}
                    type="button"
                    className="arco-podcast__transcript-row"
                    onClick={() => void vm.openEpisodeDetail(entry.episodeId, "transcript", "transcripts")}
                  >
                    {episode ? (
                      <PodcastCover
                        episodeId={episode.id}
                        tone={episode.artTone}
                        coverUrl={episode.coverUrl}
                        size="sm"
                        alt={entry.title}
                      />
                    ) : (
                      <span className="arco-podcast__transcript-row-icon" aria-hidden="true">
                        <Captions size={18} />
                      </span>
                    )}
                    <span className="arco-podcast__transcript-row-copy">
                      <strong>{entry.title}</strong>
                      <span>
                        {entry.showTitle} · {entry.wordCount.toLocaleString()}<T k={I18nKey.APPS$PODCAST_WORDS} />{engineLabel}
                      </span>
                      <span className="arco-podcast__transcript-row-preview">{entry.textPreview}</span>
                    </span>
                    <span className="arco-podcast__transcript-row-date">{formatTranscriptDate(entry.createdAt)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export interface PodcastHomeContentProps {
  vm: PodcastViewModel;
}

function FeedManager({ vm }: { vm: PodcastViewModel }) {
  const [feedUrl, setFeedUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const handleAdd = async () => {
    const url = feedUrl.trim();
    if (!url) return;
    setAddError(null);
    try {
      await vm.addRssFeed(url);
      setFeedUrl("");
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add feed");
    }
  };

  return (
    <section className="arco-podcast__section arco-podcast__feed-manager">
      <div className="arco-podcast__feed-manager-header">
        <h2 className="arco-podcast__section-title"><T k={I18nKey.APPS$PODCAST_SUBSCRIBED_FEEDS} /></h2>
        <Button
          variant="ghost"
          className="arco-podcast__sync-btn"
          onClick={() => void vm.syncDownloads()}
          disabled={vm.syncing}
        >
          <RefreshCw size={14} className={vm.syncing ? "arco-podcast__spin" : ""} />
          {vm.syncing ? "Syncing…" : "Sync downloads"}
        </Button>
      </div>
      {vm.syncMessage ? <p className="arco-podcast__sync-message">{vm.syncMessage}</p> : null}
      <form
        className="arco-podcast__feed-add"
        onSubmit={(event) => {
          event.preventDefault();
          void handleAdd();
        }}
      >
        <Input
          type="url"
          placeholder={i18n.t(I18nKey.APPS$PODCAST_PASTE_PODCAST_RSS_FEED_URL)}
          value={feedUrl}
          onChange={(event) => setFeedUrl(event.target.value)}
          aria-label={i18n.t(I18nKey.APPS$PODCAST_PODCAST_RSS_FEED_URL)}
        />
        <Button variant="primary" type="submit" disabled={vm.feedsLoading || !feedUrl.trim()}>
          <Plus size={16} /><T k={I18nKey.APPS$PODCAST_ADD_FEED} /></Button>
      </form>
      {addError ? <p className="arco-podcast__feed-error">{addError}</p> : null}
      <div className="arco-podcast__feed-list">
        {vm.rssFeeds.map((feed) => (
          <div key={feed.id} className="arco-podcast__feed-row">
            <div className="arco-podcast__feed-meta">
              <strong>{feed.label}</strong>
              <span>
                {feed.publisher}<T k={I18nKey.APPS$PODCAST_AUTO_DOWNLOAD_ON} /></span>
            </div>
            <button
              type="button"
              className="arco-podcast__icon-btn"
              aria-label={`Remove ${feed.label}`}
              disabled={vm.feedsLoading}
              onClick={() => void vm.removeRssFeed(feed.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PodcastSettingsContent({ vm }: PodcastHomeContentProps) {
  return (
    <main className="arco-podcast__main">
      <div className="arco-podcast__main-scroll arco-podcast__scrollable">
        <FeedManager vm={vm} />
      </div>
    </main>
  );
}

function PodcastShowDetail({ vm, show }: { vm: PodcastViewModel; show: PodcastShow }) {
  const coverEpisode = vm.showEpisodes[0];
  const latestPlayable = vm.showEpisodes.find((episode) => isPlayableEpisode(episode));

  return (
    <main className="arco-podcast__main">
      <div className="arco-podcast__main-scroll arco-podcast__scrollable">
        <button
          type="button"
          className="arco-podcast__back-btn"
          onClick={() => vm.setSelectedShowId(null)}
          aria-label={i18n.t(I18nKey.APPS$PODCAST_BACK_TO_PODCASTS)}
        >
          <ChevronLeft size={18} strokeWidth={1.75} /><T k={I18nKey.COMMON$BACK} /></button>

        <section className="arco-podcast__show-hero">
          <PodcastCover
            episodeId={coverEpisode?.id ?? ""}
            tone={show.artTone}
            coverUrl={coverEpisode?.coverUrl}
            size="lg"
            alt={show.title}
          />
          <div className="arco-podcast__show-hero-copy">
            <span className="arco-podcast__featured-label">
              {show.episodeCount === 1 && vm.showEpisodes[0]?.kind === "audiobook" ? "Audiobook" : "Podcast"}
            </span>
            <h1>{show.title}</h1>
            <p>
              {show.host} · {show.episodeCount}<T k={I18nKey.APPS$PODCAST_EPISODE} />{show.episodeCount === 1 ? "" : "s"}
            </p>
            {latestPlayable ? (
              <button
                type="button"
                className="arco-podcast__play-btn"
                onClick={() => vm.playEpisode(latestPlayable.id, true)}
              >
                <Play size={18} /><T k={I18nKey.APPS$PODCAST_PLAY_LATEST} /></button>
            ) : null}
          </div>
        </section>

        <section className="arco-podcast__section">
          <h2 className="arco-podcast__section-title"><T k={I18nKey.APPS$PODCAST_ALL_EPISODES} /></h2>
          {vm.showEpisodes.length === 0 ? (
            <p className="arco-podcast__downloads-hint"><T k={I18nKey.APPS$PODCAST_NO_EPISODES_MATCH_YOUR_CURRENT_FILTERS} /></p>
          ) : (
            <div className="arco-podcast__episode-list">
              {vm.showEpisodes.map((episode) => (
                <EpisodeRow key={episode.id} {...episodeRowProps(vm, episode)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export function PodcastHomeContent({ vm }: PodcastHomeContentProps) {
  const { t } = useTranslation();
  if (vm.loading) {
    return <EmptyState title={i18n.t(I18nKey.OS_BENTO_LOADING_LIBRARY)}><T k={I18nKey.APPS$PODCAST_IMPORTING_LOCAL_EPISODES_AND_RSS_FEEDS} /></EmptyState>;
  }

  if (vm.navSection === "settings") {
    return <PodcastSettingsContent vm={vm} />;
  }

  if (vm.selectedDirectoryShow) {
    return <PodcastDirectoryShowDetail vm={vm} />;
  }

  if (vm.selectedEpisodeId) {
    return <PodcastEpisodeDetail vm={vm} />;
  }

  if (vm.activeShow) {
    return <PodcastShowDetail vm={vm} show={vm.activeShow} />;
  }

  if (vm.navSection === "browse") {
    return <PodcastDirectory vm={vm} />;
  }

  if (vm.navSection === "main-feed") {
    return <PodcastMainFeed vm={vm} />;
  }

  if (vm.navSection === "home") {
    return <PodcastHomeFeed vm={vm} />;
  }

  if (vm.navSection === "transcripts") {
    return <PodcastTranscriptsContent vm={vm} />;
  }

  return <PodcastLibraryContent vm={vm} />;
}

function PodcastHomeFeed({ vm }: PodcastHomeContentProps) {
  const { t } = useTranslation();
  if (vm.followedShowCount === 0) {
    return (
      <main className="arco-podcast__main">
        <div className="arco-podcast__main-scroll arco-podcast__scrollable">
          <EmptyState title={i18n.t(I18nKey.APPS$PODCAST_YOUR_FEED_IS_EMPTY)}><T k={I18nKey.APPS$PODCAST_FOLLOW_PODCASTS_FROM_BROWSE_TO_SEE_NEW_EPISODES_FROM_YOU} /><Button variant="primary" onClick={() => vm.setNavSection("browse")}><T k={I18nKey.APPS$PODCAST_BROWSE_PODCASTS} /></Button>
          </EmptyState>
        </div>
      </main>
    );
  }

  return (
    <main className="arco-podcast__main">
      <div className="arco-podcast__main-scroll arco-podcast__scrollable">
        {vm.error ? <p className="arco-podcast__feed-error">{vm.error}</p> : null}
        {!vm.selectedEpisodeId && vm.syncMessage ? (
          <p className="arco-podcast__sync-message">{vm.syncMessage}</p>
        ) : null}

        <header className="arco-podcast__directory-header">
          <div>
            <h1 className="arco-podcast__directory-title"><T k={I18nKey.APPS$PODCAST_HOME} /></h1>
            <p className="arco-podcast__directory-subtitle"><T k={I18nKey.APPS$PODCAST_LATEST_FROM} />{vm.followedShowCount}<T k={I18nKey.APPS$PODCAST_FOLLOWED_SHOW} />{vm.followedShowCount === 1 ? "" : "s"}
            </p>
          </div>
          <Button variant="ghost" onClick={() => vm.setNavSection("browse")}><T k={I18nKey.APPS$PODCAST_DISCOVER_MORE} /></Button>
        </header>

        {vm.continueListening ? (
          <section className="arco-podcast__featured">
            <PodcastCover
              episodeId={vm.continueListening.id}
              tone={vm.continueListening.artTone}
              coverUrl={vm.continueListening.coverUrl}
              size="lg"
              alt={vm.continueListening.title}
            />
            <div className="arco-podcast__featured-copy">
              <span className="arco-podcast__featured-label"><T k={I18nKey.APPS$PODCAST_CONTINUE_LISTENING} /></span>
              <h1>{vm.continueListening.title}</h1>
              <p>
                {vm.continueListening.showTitle} · {vm.continueListening.host}
              </p>
              <button
                type="button"
                className="arco-podcast__play-btn"
                onClick={() => vm.playEpisode(vm.continueListening!.id, true)}
              >
                <Play size={18} /><T k={I18nKey.APPS$PODCAST_PLAY} /></button>
            </div>
          </section>
        ) : null}

        {vm.homeShows.length > 0 ? (
          <section className="arco-podcast__section">
            <h2 className="arco-podcast__section-title"><T k={I18nKey.APPS$PODCAST_FOLLOWING} /></h2>
            <div className="arco-podcast__show-grid">
              {vm.homeShows.map((show) => {
                const showEpisode = vm.homeEpisodes.find((episode) => episodeBelongsToShow(episode, show));
                return (
                  <button
                    key={show.id}
                    type="button"
                    className="arco-podcast__show-card"
                    onClick={() => vm.setSelectedShowId(show.id)}
                  >
                    <PodcastCover
                      episodeId={showEpisode?.id ?? ""}
                      tone={show.artTone}
                      coverUrl={showEpisode?.coverUrl}
                      size="md"
                      alt={show.title}
                    />
                    <h3>{show.title}</h3>
                    <p>
                      {show.host} · {show.episodeCount}<T k={I18nKey.APPS$PODCAST_EPISODES_2} /></p>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="arco-podcast__section">
          <h2 className="arco-podcast__section-title"><T k={I18nKey.APPS$PODCAST_NEW_IN_YOUR_FEED} /></h2>
          {vm.homeEpisodes.length === 0 ? (
            <p className="arco-podcast__downloads-hint"><T k={I18nKey.APPS$PODCAST_EPISODES_FROM_FOLLOWED_SHOWS_WILL_APPEAR_HERE_AFTER_FEED} /></p>
          ) : (
            <div className="arco-podcast__episode-list">
              {vm.homeEpisodes.map((episode) => (
                <EpisodeRow key={episode.id} {...episodeRowProps(vm, episode)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function PodcastLibraryContent({ vm }: PodcastHomeContentProps) {
  const connection = useConnectionStore((s) =>
    s.connections.find((c) => c.domain === "podcast" && c.provider === vm.activeProviderId),
  );

  if (vm.sourceFilter === "remote" && !connection) {
    return (
      <EmptyState title={`Connect ${vm.providerLabel}`}><T k={I18nKey.APPS$PODCAST_LINK_YOUR_ACCOUNT_TO_SYNC_SUBSCRIBED_SHOWS_AND_CONTINUE_} /></EmptyState>
    );
  }

  const isDownloadsView = vm.navSection === "downloads";

  if (vm.visibleEpisodes.length === 0) {
    return (
      <EmptyState title={isDownloadsView ? "No downloads yet" : "Nothing to play"}>
        {isDownloadsView
          ? "Subscribe to RSS feeds in Settings — new episodes auto-download to ~/Music/Podcasts."
          : vm.sourceFilter === "local"
            ? "Add audio to ~/Music/Podcasts or use tirufm seed episodes. Set PODCAST_SEED_DIR to override."
            : vm.sourceFilter === "rss"
              ? "Follow podcasts from Browse or add a custom RSS feed in Settings."
              : `Connect ${vm.providerLabel} with a valid token to load remote episodes.`}
      </EmptyState>
    );
  }

  return (
    <main className="arco-podcast__main">
        <div className="arco-podcast__main-scroll arco-podcast__scrollable">
          {vm.error ? <p className="arco-podcast__feed-error">{vm.error}</p> : null}
          {!vm.selectedEpisodeId && vm.syncMessage ? (
            <p className="arco-podcast__sync-message">{vm.syncMessage}</p>
          ) : null}
          {!isDownloadsView ? (
          <div className="arco-podcast__content-filters">
            {CONTENT_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`arco-podcast__filter-chip${vm.contentFilter === filter.id ? " arco-podcast__filter-chip--active" : ""}`}
                onClick={() => vm.setContentFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
            <div className="arco-podcast__source-tabs">
              <Chip
                className={vm.sourceFilter === "local" ? "arco-podcast__tab--active" : ""}
                onClick={() => vm.setSourceFilter("local")}
              ><T k={I18nKey.APPS$PODCAST_LOCAL} /></Chip>
              <Chip
                className={vm.sourceFilter === "rss" ? "arco-podcast__tab--active" : ""}
                onClick={() => vm.setSourceFilter("rss")}
              >
                RSS
              </Chip>
              <Chip
                className={vm.sourceFilter === "remote" ? "arco-podcast__tab--active" : ""}
                onClick={() => vm.setSourceFilter("remote")}
              >
                {vm.providerLabel}
              </Chip>
            </div>
          </div>
        ) : null}

        {isDownloadsView ? (
          <section className="arco-podcast__section">
            <h2 className="arco-podcast__section-title"><T k={I18nKey.APPS$PODCAST_DOWNLOADED_EPISODES} /></h2>
            {vm.visibleEpisodes.length === 0 ? (
              <p className="arco-podcast__downloads-hint"><T k={I18nKey.APPS$PODCAST_EPISODES_FROM_SUBSCRIBED_FEEDS_APPEAR_HERE_AFTER_SYNC_US} /></p>
            ) : (
              <div className="arco-podcast__episode-list">
                {vm.visibleEpisodes.map((episode) => (
                  <EpisodeRow key={episode.id} {...episodeRowProps(vm, episode)} />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {!isDownloadsView && vm.continueListening ? (
          <section className="arco-podcast__featured">
            <PodcastCover
              episodeId={vm.continueListening.id}
              tone={vm.continueListening.artTone}
              coverUrl={vm.continueListening.coverUrl}
              size="lg"
              alt={vm.continueListening.title}
            />
            <div className="arco-podcast__featured-copy">
              <span className="arco-podcast__featured-label"><T k={I18nKey.APPS$PODCAST_CONTINUE_LISTENING} /></span>
              <h1>{vm.continueListening.title}</h1>
              <p>
                {vm.continueListening.showTitle} · {vm.continueListening.host}
              </p>
              <button
                type="button"
                className="arco-podcast__play-btn"
                onClick={() => vm.playEpisode(vm.continueListening!.id, true)}
              >
                <Play size={18} /><T k={I18nKey.APPS$PODCAST_PLAY} /></button>
            </div>
          </section>
        ) : null}

        {!isDownloadsView ? (
          <>
        <section className="arco-podcast__section">
          <h2 className="arco-podcast__section-title"><T k={I18nKey.APPS$PODCAST_YOUR_SHOWS} /></h2>
          <div className="arco-podcast__show-grid">
            {vm.shows.map((show) => {
              const showEpisode = vm.visibleEpisodes.find((episode) => episodeBelongsToShow(episode, show));
              return (
                <button
                  key={show.id}
                  type="button"
                  className="arco-podcast__show-card"
                  onClick={() => vm.setSelectedShowId(show.id)}
                >
                  <PodcastCover
                    episodeId={showEpisode?.id ?? ""}
                    tone={show.artTone}
                    coverUrl={showEpisode?.coverUrl}
                    size="md"
                    alt={show.title}
                  />
                  <h3>{show.title}</h3>
                  <p>
                    {show.host} · {show.episodeCount}<T k={I18nKey.APPS$PODCAST_EPISODES_2} /></p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="arco-podcast__section">
          <h2 className="arco-podcast__section-title"><T k={I18nKey.APPS$PODCAST_EPISODES} /></h2>
          <div className="arco-podcast__episode-list">
            {vm.visibleEpisodes.map((episode) => (
              <EpisodeRow key={episode.id} {...episodeRowProps(vm, episode)} />
            ))}
          </div>
        </section>

        {vm.sourceFilter === "remote" && vm.nowPlaying.episode.listenUrl ? (
          <section className="arco-podcast__remote-hint">
            <button
              type="button"
              className="arco-podcast__remote-link"
              onClick={() => window.open(vm.nowPlaying.episode.listenUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink size={14} /><T k={I18nKey.APPS$PODCAST_OPEN_IN} />{vm.providerLabel}
            </button>
          </section>
        ) : null}
          </>
        ) : null}
        </div>
      </main>
  );
}

export interface PodcastPlayerBarProps {
  vm: PodcastViewModel;
}

export function PodcastPlayerBar({ vm }: PodcastPlayerBarProps) {
  const { episode, progress, elapsed, duration } = vm.nowPlaying;
  if (!episode.id || !isPlayableEpisode(episode)) return null;

  return (
    <MediaPlayerBar
      artwork={
        <PodcastCover
          episodeId={episode.id}
          tone={episode.artTone}
          coverUrl={episode.coverUrl}
          size="sm"
          alt={episode.title}
        />
      }
      title={episode.title}
      subtitle={episode.showTitle}
      playing={vm.playing}
      progress={progress}
      elapsed={elapsed}
      duration={duration}
      onTogglePlay={() => vm.togglePlay()}
      onPrevious={() => vm.playPrevious()}
      onNext={() => vm.playNext()}
      onSeek={vm.seekPlayback}
      showVolume
      extras={
        <>
          <button
            type="button"
            className={`arco-media-player__icon-btn arco-podcast__transcript-btn${vm.transcriptIndex[episode.id] ? " arco-podcast__transcript-btn--saved" : ""}`}
            aria-label={vm.transcriptIndex[episode.id] ? "View transcript" : "Transcribe episode"}
            title={
              vm.transcriptIndex[episode.id]
                ? "View transcript"
                : vm.transcribingIds[episode.id]
                  ? "Transcribing…"
                  : "Transcribe"
            }
            disabled={Boolean(vm.transcribingIds[episode.id])}
            onClick={() => {
              if (vm.transcriptIndex[episode.id]) void vm.openTranscript(episode.id);
              else void vm.transcribeEpisode(episode.id);
            }}
          >
            {vm.transcribingIds[episode.id] ? (
              <Loader2 size={18} className="arco-podcast__spin" />
            ) : (
              <Captions size={18} />
            )}
          </button>
          <button
            type="button"
            className={`arco-media-player__icon-btn arco-podcast__drive-btn${vm.driveSavedIds[episode.id] ? " arco-podcast__drive-btn--saved" : ""}`}
            aria-label={vm.driveSavedIds[episode.id] ? "Saved to Drive" : "Save to Drive"}
            title={vm.driveSavedIds[episode.id] ? "Saved to Drive" : "Save to Drive"}
            disabled={Boolean(vm.driveSavingIds[episode.id]) || Boolean(vm.driveSavedIds[episode.id])}
            onClick={() => void vm.saveEpisodeToDrive(episode.id)}
          >
            <HardDriveDownload size={18} />
          </button>
        </>
      }
    />
  );
}
