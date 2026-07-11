import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * StudioSidebar — Techno Studio conversation rail (agent-canvas semantics):
 * filter views, workspace-folder groups with drag reorder, collapse, and +
 * on each group to start a chat in that folder/repo.
 */
import { useEffect, useMemo, useState } from "react";
import { Calendar, Download, LayoutGrid, Layers, MoreVertical, PanelLeft, Pin, Plus, Search, Trash2 } from "lucide-react";
import type { Project, SessionSummary } from "@shared/types";
import { useAuthStore } from "../../os/auth/authStore";
import { useWindowStore } from "../../os/windowStore";
import { systemAppTitle } from "../../os/systemAppTitles";
import { Menu, type MenuItem } from "../../components/Menu";
import { StudioConversationGroups } from "./StudioConversationGroups";
import { StudioSidebarFilterMenu } from "./StudioSidebarFilterMenu";
import { StudioLogoMark } from "../../components/StudioLogoMark";
import { saveConversation } from "./conversationExport";
import {
  applyGroupOrder,
  excludePinnedSessions,
  groupSessionsByProject,
  resolvePinnedSessions,
  sortSessions,
} from "./sidebarGrouping";
import { useSidebarPreferencesStore } from "./sidebarPreferencesStore";

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

export interface StudioSidebarProps {
  sessions: SessionSummary[];
  projects: Project[];
  activeSessionId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  onNewChatInProject: (projectId: string | null) => void;
  onClose?: () => void;
}

export function StudioSidebar({
  sessions,
  projects,
  activeSessionId,
  onSelect,
  onDelete,
  onNewChat,
  onNewChatInProject,
  onClose,
}: StudioSidebarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const user = useAuthStore((s) => s.user);
  const openWindow = useWindowStore((s) => s.open);

  const organizeMode = useSidebarPreferencesStore((s) => s.organizeMode);
  const sortField = useSidebarPreferencesStore((s) => s.sortField);
  const groupOrder = useSidebarPreferencesStore((s) => s.groupOrder);
  const collapsedGroups = useSidebarPreferencesStore((s) => s.collapsedGroups);
  const expandedPreviews = useSidebarPreferencesStore((s) => s.expandedPreviews);
  const pinnedSessionIds = useSidebarPreferencesStore((s) => s.pinnedSessionIds);
  const setOrganizeMode = useSidebarPreferencesStore((s) => s.setOrganizeMode);
  const setSortField = useSidebarPreferencesStore((s) => s.setSortField);
  const setGroupOrder = useSidebarPreferencesStore((s) => s.setGroupOrder);
  const toggleGroupCollapsed = useSidebarPreferencesStore((s) => s.toggleGroupCollapsed);
  const toggleGroupPreview = useSidebarPreferencesStore((s) => s.toggleGroupPreview);
  const togglePinned = useSidebarPreferencesStore((s) => s.togglePinned);
  const prunePinned = useSidebarPreferencesStore((s) => s.prunePinned);

  const openSystem = (app: "automations" | "apps" | "skills") =>
    openWindow({ type: "system", app }, systemAppTitle(app));

  const visibleSessions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const base = sessions.filter((s) => s.kind === "chat" || s.kind === "channel");
    if (!normalized) return base;
    return base.filter((s) => s.title.toLowerCase().includes(normalized));
  }, [sessions, query]);

  useEffect(() => {
    prunePinned(sessions.map((s) => s.id));
  }, [sessions, prunePinned]);

  const pinnedSessions = useMemo(
    () => resolvePinnedSessions(pinnedSessionIds, visibleSessions),
    [pinnedSessionIds, visibleSessions],
  );

  const unpinnedSessions = useMemo(
    () => excludePinnedSessions(visibleSessions, pinnedSessionIds),
    [visibleSessions, pinnedSessionIds],
  );

  const recentSessions = useMemo(
    () => sortSessions(unpinnedSessions, sortField),
    [unpinnedSessions, sortField],
  );

  const groupedSessions = useMemo(() => {
    const groups = groupSessionsByProject(unpinnedSessions, projects, sortField, {
      sandbox: "Sandbox",
    });
    return applyGroupOrder(groups, groupOrder);
  }, [unpinnedSessions, projects, sortField, groupOrder]);

  return (
    <aside className="arco-sidenav" aria-label={i18n.t(I18nKey.APPS$STUDIO_CONVERSATIONS)}>
      <div className="arco-sidenav__brand-row">
        <StudioLogoMark className="arco-sidenav__brand" title="" />
        {onClose ? (
          <button
            type="button"
            className="arco-btn arco-btn--icon"
            onClick={onClose}
            aria-pressed
            aria-label={i18n.t(I18nKey.APPS$STUDIO_HIDE_CONVERSATIONS)}
          >
            <PanelLeft size={14} />
          </button>
        ) : null}
      </div>

      <div className="arco-sidenav__header">
        <button className="arco-btn arco-sidenav__primary" onClick={onNewChat}>
          <Plus size={14} /><T k={I18nKey.APPS$STUDIO_NEW_CHAT} /></button>
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
            <Search size={14} /><T k={I18nKey.COMMON$SEARCH} /></button>
          <button
            type="button"
            className="arco-sidenav__quicklink"
            onClick={() => openSystem("skills")}
          >
            <Layers size={14} /><T k={I18nKey.APPS$STUDIO_SKILLS} /></button>
          <button
            type="button"
            className="arco-sidenav__quicklink"
            onClick={() => openSystem("automations")}
          >
            <Calendar size={14} /><T k={I18nKey.APPS$STUDIO_SCHEDULED} /></button>
          <button
            type="button"
            className="arco-sidenav__quicklink"
            onClick={() => openSystem("apps")}
          >
            <LayoutGrid size={14} /><T k={I18nKey.APPS$STUDIO_PLUGINS} /></button>
        </div>
        {searchOpen && (
          <input
            className="arco-input"
            placeholder={i18n.t(I18nKey.APPS$STUDIO_SEARCH_CONVERSATIONS)}
            aria-label={i18n.t(I18nKey.APPS$MESSENGER_SEARCH_CONVERSATIONS)}
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
      </div>

      <div className="arco-sidenav__scroll arco-scroll">
        {pinnedSessions.length > 0 && (
          <div className="arco-sidenav__pinnedsection">
            <div className="arco-sidenav__sectionheader">
              <span className="arco-sidenav__sectiontitle arco-sidenav__sectiontitle--icon">
                <Pin size={12} aria-hidden="true" /><T k={I18nKey.APPS$STUDIO_PINNED} /></span>
            </div>
            <div className="arco-sidenav__items">
              {pinnedSessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  active={session.id === activeSessionId}
                  pinned
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onTogglePin={() => togglePinned(session.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="arco-sidenav__sectionheader">
          <span className="arco-sidenav__sectiontitle"><T k={I18nKey.APPS$STUDIO_CONVERSATIONS} /></span>
          <div className="arco-sidenav__sectionactions">
            <StudioSidebarFilterMenu
              organizeMode={organizeMode}
              sortField={sortField}
              onOrganizeModeChange={setOrganizeMode}
              onSortFieldChange={setSortField}
            />
          </div>
        </div>

        {visibleSessions.length === 0 && (
          <div className="arco-empty">{query ? "No matching conversations" : "No sessions yet"}</div>
        )}

        {organizeMode === "recent" ? (
          <div className="arco-sidenav__items">
            {recentSessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                active={session.id === activeSessionId}
                onSelect={onSelect}
                onDelete={onDelete}
                onTogglePin={() => togglePinned(session.id)}
              />
            ))}
          </div>
        ) : (
          <StudioConversationGroups
            groups={groupedSessions}
            groupOrder={groupOrder}
            collapsedGroups={collapsedGroups}
            expandedPreviews={expandedPreviews}
            activeSessionId={activeSessionId}
            onGroupOrderChange={setGroupOrder}
            onToggleCollapsed={toggleGroupCollapsed}
            onTogglePreview={toggleGroupPreview}
            onNewChatInGroup={onNewChatInProject}
            onSelect={onSelect}
            onDelete={onDelete}
            renderRow={(props) => (
              <SessionRow {...props} session={props.session} onTogglePin={() => togglePinned(props.session.id)} />
            )}
          />
        )}
      </div>

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

function SessionRow({
  session,
  active,
  pinned = false,
  onSelect,
  onDelete,
  onTogglePin,
}: {
  session: SessionSummary;
  active: boolean;
  pinned?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePin?: () => void;
}) {
  const handleSave = () => {
    void (async () => {
      try {
        await saveConversation(session.id, session.title);
      } catch {
        // Save failed — leave the list as-is.
      }
    })();
  };

  const handleDelete = () => {
    if (window.confirm(`Delete “${session.title}”? This cannot be undone.`)) {
      onDelete(session.id);
    }
  };

  const menuItems: MenuItem[] = [
    ...(onTogglePin
      ? [
          {
            id: "pin",
            label: pinned ? "Unpin" : "Pin",
            icon: Pin,
            onSelect: onTogglePin,
          } satisfies MenuItem,
        ]
      : []),
    {
      id: "save",
      label: <T k={I18nKey.APPS$STUDIO_SAVE_CONVERSATION} />,
      icon: Download,
      onSelect: handleSave,
    },
    {
      id: "delete",
      label: "Delete conversation",
      icon: Trash2,
      separatorAbove: true,
      danger: true,
      onSelect: handleDelete,
    },
  ];

  return (
    <div
      className={[
        "arco-sidenav__item",
        active && "arco-sidenav__item--active",
        pinned && "arco-sidenav__item--pinned",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="arco-sidenav__itembody"
        aria-current={active || undefined}
        onClick={() => onSelect(session.id)}
      >
        <span className="arco-sidenav__itemtitle">
          {session.kind === "automation" ? "⚙ " : ""}
          {session.title}
        </span>
        <span className="arco-sidenav__itemtime">{relativeTime(session.updatedAt)}</span>
      </button>
      <div className="arco-sidenav__itemactions">
        <Menu
          side="bottom"
          align="end"
          aria-label={i18n.t(I18nKey.APPS$STUDIO_CONVERSATION_ACTIONS)}
          items={menuItems}
          trigger={
            <button
              type="button"
              className="arco-sidenav__itemmenu"
              aria-label={i18n.t(I18nKey.APPS$STUDIO_CONVERSATION_ACTIONS)}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreVertical size={12} />
            </button>
          }
        />
      </div>
    </div>
  );
}
