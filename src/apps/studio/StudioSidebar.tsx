/**
 * StudioSidebar — the Agent Studio conversation rail ported from the
 * agent-studio design: "New chat" action, quick links, a Conversations
 * section with a Recent/Grouped view filter, and a user footer.
 *
 * Native adaptations: quick links open real system apps (Automations for
 * "Scheduled", the Apps library for "Plugins") and "Search" reveals an
 * inline title filter; the design's project grouping maps to recency
 * buckets because Arco sessions carry no project field.
 */
import { useMemo, useState } from "react";
import { Calendar, ChevronDown, Folder, LayoutGrid, Plus, Search, Trash2 } from "lucide-react";
import type { SessionSummary } from "@shared/types";
import { Menu } from "../../components/Menu";
import { useAuthStore } from "../../os/auth/authStore";
import { useWindowStore } from "../../os/windowStore";
import { systemApp } from "../../os/systemApps";

// ---------------------------------------------------------------------------
// Relative time + recency buckets
// ---------------------------------------------------------------------------

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Compact "2m / 5h / 3d / 2mo" stamp for list rows. */
export function relativeTime(iso: string, now = Date.now()): string {
  const elapsed = now - Date.parse(iso);
  if (!Number.isFinite(elapsed) || elapsed < MINUTE) return "now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < 30 * DAY) return `${Math.floor(elapsed / DAY)}d`;
  if (elapsed < 365 * DAY) return `${Math.floor(elapsed / (30 * DAY))}mo`;
  return `${Math.floor(elapsed / (365 * DAY))}y`;
}

function recencyBucket(iso: string, now = Date.now()): string {
  const elapsed = now - Date.parse(iso);
  if (!Number.isFinite(elapsed) || elapsed < DAY) return "Today";
  if (elapsed < 2 * DAY) return "Yesterday";
  if (elapsed < 7 * DAY) return "This week";
  if (elapsed < 30 * DAY) return "This month";
  return "Older";
}

const BUCKET_ORDER = ["Today", "Yesterday", "This week", "This month", "Older"];

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

type ListView = "recent" | "grouped";

export interface StudioSidebarProps {
  sessions: SessionSummary[];
  activeSessionId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
}

export function StudioSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  onNewChat,
}: StudioSidebarProps) {
  const [listView, setListView] = useState<ListView>("recent");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const user = useAuthStore((s) => s.user);
  const openWindow = useWindowStore((s) => s.open);

  const openSystem = (app: "automations" | "apps") =>
    openWindow({ type: "system", app }, systemApp(app).title);

  const visibleSessions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(normalized));
  }, [sessions, query]);

  const groups = useMemo(() => {
    if (listView !== "grouped") return [];
    const byBucket = new Map<string, SessionSummary[]>();
    for (const session of visibleSessions) {
      const bucket = recencyBucket(session.updatedAt);
      const list = byBucket.get(bucket);
      if (list) list.push(session);
      else byBucket.set(bucket, [session]);
    }
    return BUCKET_ORDER.filter((b) => byBucket.has(b)).map((b) => ({
      label: b,
      items: byBucket.get(b)!,
    }));
  }, [listView, visibleSessions]);

  return (
    <aside className="arco-sidenav" aria-label="Conversations">
      {/* ── Header: primary action + quick links ─────────────────────────── */}
      <div className="arco-sidenav__header">
        <button className="arco-btn arco-sidenav__primary" onClick={onNewChat}>
          <Plus size={14} /> New chat
        </button>
        <div className="arco-sidenav__quicklinks">
          <button
            type="button"
            className="arco-sidenav__quicklink"
            aria-pressed={searchOpen}
            onClick={() => {
              setSearchOpen((v) => !v);
              setQuery("");
            }}
          >
            <Search size={14} /> Search
          </button>
          <button
            type="button"
            className="arco-sidenav__quicklink"
            onClick={() => openSystem("automations")}
          >
            <Calendar size={14} /> Scheduled
          </button>
          <button
            type="button"
            className="arco-sidenav__quicklink"
            onClick={() => openSystem("apps")}
          >
            <LayoutGrid size={14} /> Plugins
          </button>
        </div>
        {searchOpen && (
          <input
            className="arco-input"
            placeholder="Search conversations…"
            aria-label="Search conversations"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
      </div>

      {/* ── Conversations section ─────────────────────────────────────────── */}
      <div className="arco-sidenav__scroll arco-scroll">
        <div className="arco-sidenav__sectionheader">
          <span className="arco-sidenav__sectiontitle">Conversations</span>
          <Menu
            side="bottom"
            align="end"
            aria-label="Conversation list view"
            items={[
              { id: "recent", label: "Recent", checked: listView === "recent", onSelect: () => setListView("recent") },
              { id: "grouped", label: "Grouped", checked: listView === "grouped", onSelect: () => setListView("grouped") },
            ]}
            trigger={
              <button type="button" className="arco-sidenav__filter" aria-label="Conversation list view">
                {listView === "recent" ? "Recent" : "Grouped"}
                <ChevronDown size={11} aria-hidden="true" />
              </button>
            }
          />
        </div>

        {visibleSessions.length === 0 && (
          <div className="arco-empty">{query ? "No matching conversations" : "No sessions yet"}</div>
        )}

        {listView === "recent" ? (
          <div className="arco-sidenav__items">
            {visibleSessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                active={session.id === activeSessionId}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : (
          <div className="arco-sidenav__groups">
            {groups.map((group) => (
              <div key={group.label} className="arco-sidenav__group">
                <div className="arco-sidenav__groupheader">
                  <Folder size={14} aria-hidden="true" />
                  <span className="arco-sidenav__grouplabel">{group.label}</span>
                </div>
                <div className="arco-sidenav__groupitems">
                  {group.items.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      active={session.id === activeSessionId}
                      onSelect={onSelect}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── User footer ───────────────────────────────────────────────────── */}
      {user && (
        <div className="arco-sidenav__footer">
          <span className="arco-sidenav__avatar" aria-hidden="true">
            {initials(user.displayName)}
          </span>
          <span className="arco-sidenav__userbody">
            <span className="arco-sidenav__username">{user.displayName}</span>
            <span className="arco-sidenav__usermeta">{user.role}</span>
          </span>
        </div>
      )}
    </aside>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** One conversation row: title, relative timestamp, hover-revealed delete. */
function SessionRow({
  session,
  active,
  onSelect,
  onDelete,
}: {
  session: SessionSummary;
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={`arco-sidenav__item ${active ? "arco-sidenav__item--active" : ""}`}>
      <button
        type="button"
        className="arco-sidenav__itemtitle"
        aria-current={active || undefined}
        onClick={() => onSelect(session.id)}
      >
        {session.kind === "automation" ? "⚙ " : ""}
        {session.title}
      </button>
      <span className="arco-sidenav__itemtime">{relativeTime(session.updatedAt)}</span>
      <button
        type="button"
        className="arco-sidenav__itemdelete"
        aria-label={`Delete session ${session.title}`}
        onClick={() => onDelete(session.id)}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
