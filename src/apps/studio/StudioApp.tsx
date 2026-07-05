/**
 * Agent Studio — Arco's workbench surface (agent-canvas layout): a
 * conversation sidebar on the left, the chat thread + rich composer in the
 * middle, and a resizable context drawer on the right whose tabs
 * (Files / Diffs / Terminal / Preview) update live as the agent works.
 *
 * Chat state reuses the same useChat hook as the Chat app; workspace state
 * comes from the global studio store, which handleShellEvent feeds for every
 * agent turn regardless of which surface ran it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppWindow,
  FileDiff,
  FolderTree,
  Globe,
  PanelLeft,
  PanelRight,
  Plus,
  SquareTerminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WorkspaceTab } from "@shared/types";
import { useChat } from "../chat/useChat";
import { AssistantBlock } from "../chat/AssistantBlock";
import { ToolCard } from "../chat/ToolCard";
import { ConfirmCard } from "../chat/ConfirmCard";
import { VoiceBar } from "../chat/VoiceBar";
import { useVoice, voiceClient } from "../../voice";
import { FaceWidget } from "../../face-rig";
import { Composer } from "../../components/composer/Composer";
import { ComposerNotice } from "../../components/composer/ComposerNotice";
import { contextPercent, type UsageStats } from "../../components/composer/UsagePopover";
import { useStudioStore } from "./studioStore";
import { useResizableSplit } from "./useResizableSplit";
import { useModelSelection } from "./useModelSelection";
import { ProjectPicker } from "./ProjectPicker";
import { StudioSidebar } from "./StudioSidebar";
import { FilesTab } from "./tabs/FilesTab";
import { GitTab } from "./tabs/GitTab";
import { TerminalTab } from "./tabs/TerminalTab";
import { BrowserTab } from "./tabs/BrowserTab";
import { PreviewTab } from "./tabs/PreviewTab";

// ---------------------------------------------------------------------------
// Drawer tab registry — adding a tab is one entry here plus its component.
// ---------------------------------------------------------------------------

const DRAWER_TABS: { id: WorkspaceTab; label: string; icon: LucideIcon }[] = [
  { id: "files", label: "Files", icon: FolderTree },
  { id: "diffs", label: "Git", icon: FileDiff },
  { id: "terminal", label: "Terminal", icon: SquareTerminal },
  { id: "browser", label: "Browser", icon: Globe },
  { id: "preview", label: "Preview", icon: AppWindow },
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
  const chat = useChat();
  const voice = useVoice();
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("agent");
  /** Session key whose near-limit notice the user dismissed. */
  const [noticeDismissedFor, setNoticeDismissedFor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { onDividerPointerDown } = useResizableSplit(containerRef);
  const { modelLabel, modelItems } = useModelSelection();

  const navOpen = useStudioStore((s) => s.navOpen);
  const setNavOpen = useStudioStore((s) => s.setNavOpen);
  const drawerOpen = useStudioStore((s) => s.drawerOpen);
  const setDrawerOpen = useStudioStore((s) => s.setDrawerOpen);
  const activeTab = useStudioStore((s) => s.activeTab);
  const setActiveTab = useStudioStore((s) => s.setActiveTab);
  const chatWidthPct = useStudioStore((s) => s.chatWidthPct);
  // Badge prefers real git state; session snapshots cover the sandbox case.
  const changeCount = useStudioStore((s) =>
    s.gitChangeCount > 0 ? s.gitChangeCount : Object.keys(s.changes).length,
  );

  // Follow the stream unless the user scrolled up (same pattern as ChatApp).
  const followRef = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && followRef.current) el.scrollTop = el.scrollHeight;
  }, [chat.items]);

  // Voice conversations land in the thread like typed ones (same as ChatApp):
  // final transcripts as user items, bot speech as streaming assistant text.
  useEffect(() => voiceClient.subscribe(chat.applyVoiceEvent), [chat.applyVoiceEvent]);

  const submit = useCallback(
    (text?: string) => {
      const value = (text ?? draft).trim();
      if (!value) return;
      setDraft("");
      followRef.current = true;
      // Ask mode runs the turn answer-only: the server strips write tools.
      void chat.send(value, mode === "ask" ? { mode: "ask" } : undefined);
    },
    [draft, chat, mode],
  );

  // ── Composer wiring ───────────────────────────────────────────────────────

  // The "+" menu's panel switches drive the single workspace drawer: turning
  // a panel on selects its tab and opens the drawer; off closes the drawer.
  const panelToggles = useMemo(
    () =>
      DRAWER_TABS.map((tab) => ({
        id: tab.id,
        label: tab.label,
        visible: drawerOpen && activeTab === tab.id,
        onVisibleChange: (visible: boolean) => {
          if (visible) {
            setActiveTab(tab.id);
            setDrawerOpen(true);
          } else {
            setDrawerOpen(false);
          }
        },
      })),
    [drawerOpen, activeTab, setActiveTab, setDrawerOpen],
  );

  const openFilesPanel = useCallback(() => {
    setActiveTab("files");
    setDrawerOpen(true);
  }, [setActiveTab, setDrawerOpen]);

  const usage = useMemo(() => estimateUsage(chat.items), [chat.items]);
  const usagePercent = contextPercent(usage);
  const noticeKey = chat.sessionId ?? "new";
  const showLimitNotice = usagePercent >= 90 && noticeDismissedFor !== noticeKey;

  return (
    <div className="arco-studio">
      {/* ── Top bar: rail + drawer toggles ─────────────────────────────── */}
      <div className="arco-studio__topbar">
        <button
          className="arco-btn arco-btn--icon"
          onClick={() => setNavOpen(!navOpen)}
          aria-pressed={navOpen}
          aria-label="Toggle sessions rail"
        >
          <PanelLeft size={14} />
        </button>
        <button className="arco-btn" onClick={chat.newChat}>
          <Plus size={13} /> New session
        </button>
        <span style={{ flex: 1 }} />
        <ProjectPicker />
        <button
          className="arco-btn arco-btn--icon"
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-pressed={drawerOpen}
          aria-label="Toggle workspace drawer"
        >
          <PanelRight size={14} />
        </button>
      </div>

      <div className="arco-studio__body" ref={containerRef}>
        {/* ── Left: conversations sidebar ──────────────────────────────── */}
        {navOpen && (
          <StudioSidebar
            sessions={chat.sessions}
            activeSessionId={chat.sessionId}
            onSelect={(id) => void chat.loadSession(id)}
            onDelete={(id) => void chat.removeSession(id)}
            onNewChat={chat.newChat}
          />
        )}

        {/* ── Center: chat thread + composer ───────────────────────────── */}
        <section
          className="arco-studio__chat"
          style={drawerOpen ? { width: `${chatWidthPct}%`, flex: "none" } : undefined}
        >
          <div
            ref={scrollRef}
            className="arco-chat__thread arco-scroll"
            onScroll={() => {
              const el = scrollRef.current;
              if (el) followRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
            }}
          >
            {chat.items.length === 0 && (
              <div className="arco-empty">
                <FaceWidget className="arco-studio__emptyface" />
                <strong style={{ color: "var(--arco-text-secondary)", fontSize: "var(--arco-text-md)" }}>
                  Build with the agent
                </strong>
                <span>Files, diffs, commands, and app previews appear in the drawer as it works.</span>
              </div>
            )}
            {chat.items.map((item) => {
              switch (item.kind) {
                case "user":
                  return (
                    <div key={item.id} className="arco-chat__user">
                      {item.text}
                    </div>
                  );
                case "assistant":
                  return <AssistantBlock key={item.id} item={item} onFollowUp={submit} />;
                case "tool":
                  return <ToolCard key={item.id} item={item} />;
                case "confirm":
                  return <ConfirmCard key={item.id} item={item} />;
                case "error":
                  return (
                    <div key={item.id} className="arco-chat__error">
                      {item.text}
                    </div>
                  );
              }
            })}
            {chat.streaming && <div className="arco-chat__working">Working…</div>}
          </div>

          {voice.active && <VoiceBar voice={voice} />}

          <div className="arco-composer-dock">
            <Composer
              value={draft}
              onChange={setDraft}
              onSubmit={() => submit()}
              streaming={chat.streaming}
              onStop={chat.stop}
              placeholder="Ask the agent to build, script, or automate…"
              modes={COMPOSER_MODES}
              activeModeId={mode}
              onModeChange={setMode}
              model={modelLabel}
              modelItems={modelItems}
              onAddFile={openFilesPanel}
              panelToggles={panelToggles}
              voiceActive={voice.active}
              voiceAvailable={voice.available}
              onVoiceToggle={() => void voice.toggle().catch(() => {})}
              usage={usage}
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
          </div>
        </section>

        {/* ── Divider + right drawer ───────────────────────────────────── */}
        {drawerOpen && (
          <>
            <div
              className="arco-studio__divider"
              role="separator"
              aria-orientation="vertical"
              onPointerDown={onDividerPointerDown}
            />
            <section className="arco-studio__drawer" aria-label="Workspace">
              <div className="arco-studio__tabs" role="tablist">
                {DRAWER_TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={activeTab === id}
                    className={`arco-studio__tab ${activeTab === id ? "arco-studio__tab--active" : ""}`}
                    onClick={() => setActiveTab(id)}
                  >
                    <Icon size={13} />
                    {label}
                    {id === "diffs" && changeCount > 0 && (
                      <span className="arco-studio__tabbadge">{changeCount}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="arco-studio__tabcontent">
                {activeTab === "files" && <FilesTab />}
                {activeTab === "diffs" && <GitTab />}
                {activeTab === "terminal" && <TerminalTab />}
                {activeTab === "browser" && <BrowserTab />}
                {activeTab === "preview" && <PreviewTab />}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
