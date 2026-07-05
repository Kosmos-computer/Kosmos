/**
 * Agent Studio — Arco's workbench surface (agent-canvas layout): a session
 * rail on the left, the chat thread in the middle, and a resizable context
 * drawer on the right whose tabs (Files / Diffs / Terminal / Preview) update
 * live as the agent works.
 *
 * Chat state reuses the same useChat hook as the Chat app; workspace state
 * comes from the global studio store, which handleShellEvent feeds for every
 * agent turn regardless of which surface ran it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppWindow,
  FileDiff,
  FolderTree,
  Globe,
  PanelLeft,
  PanelRight,
  Plus,
  Send,
  Square,
  SquareTerminal,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WorkspaceTab } from "@shared/types";
import { useChat } from "../chat/useChat";
import { AssistantBlock } from "../chat/AssistantBlock";
import { ToolCard } from "../chat/ToolCard";
import { ConfirmCard } from "../chat/ConfirmCard";
import { useStudioStore } from "./studioStore";
import { useResizableSplit } from "./useResizableSplit";
import { ProjectPicker } from "./ProjectPicker";
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

export function StudioApp() {
  const chat = useChat();
  const [draft, setDraft] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { onDividerPointerDown } = useResizableSplit(containerRef);

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

  const submit = useCallback(
    (text?: string) => {
      const value = (text ?? draft).trim();
      if (!value) return;
      setDraft("");
      followRef.current = true;
      void chat.send(value);
    },
    [draft, chat],
  );

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
        {/* ── Left rail: sessions ──────────────────────────────────────── */}
        {navOpen && (
          <aside className="arco-studio__rail arco-scroll" aria-label="Sessions">
            {chat.sessions.length === 0 && <div className="arco-empty">No sessions yet</div>}
            {chat.sessions.map((s) => (
              <div
                key={s.id}
                className={`arco-chat__session ${s.id === chat.sessionId ? "arco-chat__session--active" : ""}`}
              >
                <button
                  className="arco-chat__session-title"
                  onClick={() => void chat.loadSession(s.id)}
                >
                  {s.kind === "automation" ? "⚙ " : ""}
                  {s.title}
                </button>
                <button
                  aria-label={`Delete session ${s.title}`}
                  className="arco-chat__session-delete"
                  onClick={() => void chat.removeSession(s.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </aside>
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

          <div className="arco-chat__composer">
            <textarea
              className="arco-chat__input"
              placeholder="Ask the agent to build, script, or automate…"
              value={draft}
              rows={1}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            {chat.streaming ? (
              <button className="arco-btn arco-btn--danger" onClick={chat.stop} aria-label="Stop">
                <Square size={13} />
              </button>
            ) : (
              <button
                className="arco-btn arco-btn--primary"
                onClick={() => submit()}
                disabled={!draft.trim()}
                aria-label="Send"
              >
                <Send size={13} />
              </button>
            )}
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
