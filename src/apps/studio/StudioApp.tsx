import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
/**
 * Techno Studio — Arco's workbench surface (agent-canvas layout): a
 * conversation sidebar on the left, the chat thread + rich composer in the
 * middle, and a resizable context drawer on the right whose tabs
 * (Files / Git / Terminal / Browser) update live as the agent works.
 *
 * Chat state reuses the same useChat hook as the Chat app; workspace state
 * comes from the global studio store, which handleShellEvent feeds for every
 * agent turn regardless of which surface ran it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FileDiff,
  FolderTree,
  Globe,
  PanelRight,
  SquareTerminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ApprovalMode, WorkspaceTab } from "@shared/types";
import { useChat } from "../chat/useChat";
import { useActiveAgentProfile } from "../chat/useActiveAgentProfile";
import { onPrimeComposer } from "../chat/composerBus";
import { VoiceBar } from "../chat/VoiceBar";
import { ChatThread } from "../../components/chat/ChatThread";
import { ScrollToLatestButton } from "../../components/chat/ScrollToLatestButton";
import { useThreadScroll } from "../../components/chat/useThreadScroll";
import { useVoice, voiceClient } from "../../voice";
import { FaceWidget } from "../../face-rig";
import { Composer } from "../../components/composer/Composer";
import { ComposerNotice } from "../../components/composer/ComposerNotice";
import { DEFAULT_APPROVAL_MODE } from "../../components/composer/approvalModes";
import { DEFAULT_TOOLSET_IDS } from "../../components/composer/toolsets";
import { contextPercent, type UsageStats } from "../../components/composer/UsagePopover";
import { useStudioStore, useSessionActivity } from "./studioStore";
import { useResizableSplit } from "./useResizableSplit";
import { useModelSelection } from "./useModelSelection";
import { WorkspaceChrome } from "./WorkspaceChrome";
import { StudioSidebar } from "./StudioSidebar";
import { StudioConversationHeader } from "./StudioConversationHeader";
import { FilesTab } from "./tabs/FilesTab";
import { GitTab } from "./tabs/GitTab";
import { TerminalTab } from "./tabs/TerminalTab";
import { BrowserTab } from "./tabs/BrowserTab";
import { useComposerAttach } from "../../components/composer/useComposerAttach";

// ---------------------------------------------------------------------------
// Drawer tab registry — adding a tab is one entry here plus its component.
// ---------------------------------------------------------------------------

const DRAWER_TABS: { id: WorkspaceTab; label: string; icon: LucideIcon }[] = [
  { id: "files", label: "Files", icon: FolderTree },
  { id: "diffs", label: "Git", icon: FileDiff },
  { id: "terminal", label: "Terminal", icon: SquareTerminal },
  { id: "browser", label: "Browser", icon: Globe },
];

/** Composer mode switch — Agent acts on the workspace, Ask just answers. */
const COMPOSER_MODES = [
  { id: "agent", label: "Agent" },
  { id: "ask", label: "Ask" },
];

// ---------------------------------------------------------------------------
// Context usage estimate
//
// There is no server-side token accounting yet, so the meter estimates from
// the visible thread at ~4 chars/token against the local-model window. Plan
// percentages are placeholders until a usage API exists.
// ---------------------------------------------------------------------------

const CONTEXT_LIMIT_K = 128;

function estimateUsage(items: ReturnType<typeof useChat>["items"]): UsageStats {
  let chars = 0;
  for (const item of items) {
    if (item.kind === "user" || item.kind === "assistant" || item.kind === "error") {
      chars += item.text.length;
    } else if (item.kind === "tool") {
      chars += JSON.stringify(item.args).length + (item.result?.length ?? 0);
    }
  }
  const usedK = chars / 4 / 1000;
  const percent = Math.round((usedK / CONTEXT_LIMIT_K) * 100);
  return {
    contextUsedK: usedK,
    contextLimitK: CONTEXT_LIMIT_K,
    fiveHourPercent: Math.min(100, percent),
    weeklyPercent: Math.min(100, Math.round(percent / 2)),
  };
}

export function StudioApp() {
  const projectsInfo = useStudioStore((s) => s.projectsInfo);
  const switchProject = useStudioStore((s) => s.switchProject);
  const chat = useChat({
    activeProjectId: projectsInfo.activeId,
    persistedSessionKey: "arco:studio:active-session:v1",
  });
  const voice = useVoice();
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("agent");
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(DEFAULT_APPROVAL_MODE);
  const [toolsetIds, setToolsetIds] = useState<string[]>(() => [...DEFAULT_TOOLSET_IDS]);
  /** Session key whose near-limit notice the user dismissed. */
  const [noticeDismissedFor, setNoticeDismissedFor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { onDividerPointerDown, isResizing } = useResizableSplit(containerRef);
  const { profileId, agentLabel, agentItems, active } = useActiveAgentProfile();
  const { modelLabel, modelItems } = useModelSelection(active);
  const { scrollRef, onScroll, showJump, scrollToLatest, pinToLatest } =
    useThreadScroll(chat.items);

  const navOpen = useStudioStore((s) => s.navOpen);
  const setNavOpen = useStudioStore((s) => s.setNavOpen);
  const drawerOpen = useStudioStore((s) => s.drawerOpen);
  const setDrawerOpen = useStudioStore((s) => s.setDrawerOpen);
  const activeTab = useStudioStore((s) => s.activeTab);
  const setActiveTab = useStudioStore((s) => s.setActiveTab);
  const chatWidthPct = useStudioStore((s) => s.chatWidthPct);
  // Badge prefers real git state; session snapshots cover the sandbox case.
  const sessionActivity = useSessionActivity();
  const changeCount = useStudioStore((s) =>
    s.gitChangeCount > 0 ? s.gitChangeCount : Object.keys(sessionActivity.changes).length,
  );

  // Voice conversations land in the thread like typed ones (same as ChatApp):
  // final transcripts as user items, bot speech as streaming assistant text.
  useEffect(() => voiceClient.subscribe(chat.applyVoiceEvent), [chat.applyVoiceEvent]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !chat.streaming) return;
      event.preventDefault();
      event.stopPropagation();
      chat.stop();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [chat.stop, chat.streaming]);

  useEffect(
    () =>
      onPrimeComposer(({ text, submit: shouldSubmit }) => {
        if (shouldSubmit) {
          setDraft("");
          pinToLatest();
          void chat.send(text, { profileId });
          return;
        }
        setDraft(text);
      }),
    [chat, pinToLatest, profileId],
  );

  const submit = useCallback(
    (text?: string) => {
      const value = (text ?? draft).trim();
      if (!value) return;
      setDraft("");
      pinToLatest();
      // Ask mode runs the turn answer-only: the server strips write tools.
      // Approval posture only applies when the agent can act.
      void chat.send(value, {
        ...(mode === "ask" ? { mode: "ask" as const } : {}),
        ...(mode === "agent" ? { approvalMode } : {}),
        profileId,
        toolsetIds,
      });
    },
    [draft, chat, mode, approvalMode, profileId, toolsetIds, pinToLatest],
  );

  // ── Composer wiring ───────────────────────────────────────────────────────

  const openFilesPanel = useCallback(() => {
    setActiveTab("files");
    setDrawerOpen(true);
  }, [setActiveTab, setDrawerOpen]);

  const openFolder = useStudioStore((s) => s.openFolder);
  const attach = useComposerAttach({
    onOpenFilesPanel: openFilesPanel,
    onOpenFolder: (path) => openFolder(path),
    onInsertDraft: (text) =>
      setDraft((current) => (current.trim() ? `${current.trim()}\n\n${text}` : text)),
  });

  const usage = useMemo(() => estimateUsage(chat.items), [chat.items]);
  const usagePercent = contextPercent(usage);
  const noticeKey = chat.sessionId ?? "new";
  const showLimitNotice = usagePercent >= 90 && noticeDismissedFor !== noticeKey;
  const isEmpty = chat.items.length === 0;
  const activeSessionTitle = useMemo(() => {
    if (!chat.sessionId) return "New chat";
    return chat.sessions.find((s) => s.id === chat.sessionId)?.title ?? "New chat";
  }, [chat.sessionId, chat.sessions]);

  useEffect(() => {
    if (!chat.sessionId) return;
    const restored = chat.sessions.find((session) => session.id === chat.sessionId);
    if (restored && (restored.projectId ?? null) !== projectsInfo.activeId) {
      void switchProject(restored.projectId ?? null).catch(() => {});
    }
  }, [chat.sessionId, chat.sessions, projectsInfo.activeId, switchProject]);

  const selectSession = useCallback(
    (id: string) => {
      void (async () => {
        try {
          const session = await chat.loadSession(id);
          const targetProjectId = session.projectId ?? null;
          if (targetProjectId !== projectsInfo.activeId) {
            try {
              await switchProject(targetProjectId);
            } catch {
              // Stale or removed project — thread is already open.
            }
          }
        } catch {
          // Session fetch failed — leave the current thread as-is.
        }
      })();
    },
    [chat.loadSession, projectsInfo.activeId, switchProject],
  );

  const newChatInProject = useCallback(
    (projectId: string | null) => {
      void switchProject(projectId).then(() => chat.newChat());
    },
    [chat, switchProject],
  );

  const composer = (
    <>
      {attach.fileInput}
      {attach.githubModal}
      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={() => submit()}
        historyStorageKey="arco:studio:composer-history:v1"
        streaming={chat.streaming}
        onStop={chat.stop}
        placeholder={i18n.t(I18nKey.APPS$STUDIO_ASK_THE_AGENT_TO_BUILD_SCRIPT_OR_AUTOMATE)}
        modes={COMPOSER_MODES}
        activeModeId={mode}
        onModeChange={setMode}
        approvalMode={mode === "agent" ? approvalMode : undefined}
        onApprovalModeChange={mode === "agent" ? setApprovalMode : undefined}
        toolsetIds={mode === "agent" ? toolsetIds : undefined}
        onToolsetIdsChange={mode === "agent" ? setToolsetIds : undefined}
        agent={agentLabel}
        agentItems={agentItems}
        model={modelLabel}
        modelItems={modelItems}
        onAddFile={attach.onAddFile}
        onAddFolder={attach.onAddFolder}
        onImportGitHubIssue={attach.onImportGitHubIssue}
        onAddPlugins={attach.onAddPlugins}
        onManageConnectors={attach.onManageConnectors}
        onBrowseConnectors={attach.onBrowseConnectors}
        connectors={attach.connectors}
        onFilesDropped={attach.onFilesDropped}
        voiceActive={voice.active}
        voiceAvailable={voice.available}
        onVoiceToggle={() => void voice.toggle().catch(() => {})}
        usage={usage}
        statusStart={<WorkspaceChrome />}
        notice={
          showLimitNotice ? (
            <ComposerNotice
              tone={usagePercent >= 100 ? "danger" : "warning"}
              actionLabel="New session"
              onAction={chat.newChat}
              onDismiss={() => setNoticeDismissedFor(noticeKey)}
            >
              {usagePercent >= 100
                ? "Context is over the limit — start a new session to keep responses sharp"
                : "This session is close to the context limit"}
            </ComposerNotice>
          ) : undefined
        }
      />
    </>
  );

  return (
    <div className="arco-studio">
      <div className="arco-studio__body">
        {/* ── Left: conversations sidebar (icons remain when collapsed) ─── */}
        <StudioSidebar
          sessions={chat.sessions}
          projects={projectsInfo.projects}
          activeSessionId={chat.sessionId}
          collapsed={!navOpen}
          onSelect={selectSession}
          onDelete={(id) => void chat.removeSession(id)}
          onNewChat={chat.newChat}
          onNewChatInProject={newChatInProject}
          onToggleCollapsed={() => setNavOpen(!navOpen)}
        />

        {/* Chat + drawer split — resize % is relative to this pane only. */}
        <div className="arco-studio__split" ref={containerRef}>
          {/* ── Center: chat thread + composer ───────────────────────────── */}
          <section
            className="arco-studio__chat"
            style={drawerOpen ? { width: `${chatWidthPct}%`, flex: "none" } : undefined}
          >
            {isEmpty ? (
              <div className="arco-studio__empty">
                {voice.active ? (
                  <VoiceBar voice={voice} placement="expanded" />
                ) : (
                  <FaceWidget className="arco-studio__emptyface" />
                )}
                <div className="arco-studio__content-inner">
                  {voice.active && <VoiceBar voice={voice} placement="dock" />}
                  {composer}
                </div>
              </div>
            ) : (
              <>
                <div className="arco-studio__convbar">
                  <StudioConversationHeader
                    sessionId={chat.sessionId}
                    title={activeSessionTitle}
                    feedItems={chat.items}
                    activity={sessionActivity}
                    onRename={
                      chat.sessionId
                        ? (title) => chat.renameSession(chat.sessionId!, title)
                        : undefined
                    }
                    onNewChat={chat.newChat}
                    onDelete={
                      chat.sessionId ? () => chat.removeSession(chat.sessionId!) : undefined
                    }
                  />
                </div>
                {voice.active && <VoiceBar voice={voice} placement="expanded" />}
                <div
                  ref={scrollRef}
                  className="arco-chat__thread arco-scroll"
                  onScroll={onScroll}
                >
                  <div className="arco-studio__content-inner">
                    <ChatThread
                      items={chat.items}
                      streaming={chat.streaming}
                      turnMeta={chat.turnMeta}
                      onFollowUp={submit}
                    />
                  </div>
                </div>
                <div className="arco-composer-dock">
                  <ScrollToLatestButton visible={showJump} onClick={scrollToLatest} />
                  <div className="arco-studio__content-inner">
                    {voice.active && <VoiceBar voice={voice} placement="dock" />}
                    {composer}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* ── Divider + right drawer ───────────────────────────────────── */}
          {drawerOpen ? (
            <>
              <div
                className={[
                  "arco-resize-handle",
                  isResizing ? "arco-resize-handle--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role="separator"
                aria-orientation="vertical"
                aria-label={i18n.t(I18nKey.APPS$STUDIO_RESIZE_WORKSPACE_DRAWER)}
                onPointerDown={onDividerPointerDown}
              >
                <span className="arco-resize-handle__grip" aria-hidden="true" />
              </div>
              <section className="arco-studio__drawer" aria-label={i18n.t(I18nKey.APPS$STUDIO_WORKSPACE_2)}>
                <div className="arco-studio__tabbar">
                  <div className="arco-studio__tabs" role="tablist">
                    {DRAWER_TABS.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        role="tab"
                        aria-selected={activeTab === id}
                        aria-label={label}
                        className={`arco-studio__tab ${activeTab === id ? "arco-studio__tab--active" : ""}`}
                        onClick={() => setActiveTab(id)}
                      >
                        <Icon size={13} />
                        <span className="arco-studio__tablabel">{label}</span>
                        {id === "diffs" && changeCount > 0 && (
                          <span className="arco-studio__tabbadge">{changeCount}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="arco-studio__tabactions">
                    <button
                      type="button"
                      className="arco-btn arco-btn--icon"
                      onClick={() => setDrawerOpen(false)}
                      aria-pressed
                      aria-label={i18n.t(I18nKey.APPS$STUDIO_HIDE_WORKSPACE_DRAWER)}
                    >
                      <PanelRight size={14} />
                    </button>
                  </div>
                </div>
                <div className="arco-studio__tabcontent">
                  {activeTab === "files" && <FilesTab />}
                  {activeTab === "diffs" && <GitTab />}
                  {activeTab === "terminal" && <TerminalTab />}
                  {activeTab === "browser" && (
                    <BrowserTab
                      onInsertDraft={(text) =>
                        setDraft((current) => (current.trim() ? `${current.trim()}\n\n${text}` : text))
                      }
                      onSubmitMessage={(text) => submit(text)}
                    />
                  )}
                </div>
              </section>
            </>
          ) : (
            <div className="arco-studio__rail arco-studio__rail--right">
              <button
                type="button"
                className="arco-btn arco-btn--icon"
                onClick={() => setDrawerOpen(true)}
                aria-pressed={false}
                aria-label={i18n.t(I18nKey.APPS$STUDIO_SHOW_WORKSPACE_DRAWER)}
              >
                <PanelRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
