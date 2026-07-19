import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * StudioSidebar — Techno Studio conversation rail (agent-canvas semantics):
 * filter views, workspace-folder groups with drag reorder, collapse, and +
 * on each group to start a chat in that folder/repo.
 */
import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Calendar, ChevronRight, Columns3, Download, LayoutGrid, Layers, MoreVertical, PanelLeft, Pin, Plus, Search, Trash2 } from "lucide-react";
import type { Project, SessionSummary } from "@shared/types";
import { useAuthStore } from "../../os/auth/authStore";
import { useWindowStore } from "../../os/windowStore";
import { systemAppTitle } from "../../os/systemAppTitles";
import { Menu, type MenuItem } from "../../components/Menu";
import { openApisApp } from "../apis/apisNavStore";
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
import { useUnreadSessionsStore } from "./unreadSessionsStore";

/** Interactive targets that keep their own click behavior when the rail is collapsed. */
const COLLAPSED_RAIL_INTERACTIVE =
  "button, a, input, textarea, select, label, [role='button'], [role='menuitem']";

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
  /** Center pane: chat vs Board. Board press shows selected in the rail. */
  mainSurface?: "chat" | "board";
  /** OpenHands-style icon rail when true — quick actions stay, list hides. */
  collapsed?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  onNewChatInProject: (projectId: string | null) => void;
  onSelectBoard?: () => void;
  onToggleCollapsed?: () => void;
}

export function StudioSidebar({
  sessions,
  projects,
  activeSessionId,
  mainSurface = "chat",
  collapsed = false,
  onSelect,
  onDelete,
  onNewChat,
  onNewChatInProject,
  onSelectBoard,
  onToggleCollapsed,
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

  const openSystem = (app: "automations" | "skills") =>
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

  /** Collapsed rail: empty chrome + footer expand; real controls keep their handlers. */
  const onCollapsedRailClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (!collapsed || !onToggleCollapsed) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(COLLAPSED_RAIL_INTERACTIVE)) return;
    onToggleCollapsed();
  };

  return (
    <aside
      className={["arco-sidenav", collapsed && "arco-sidenav--collapsed"].filter(Boolean).join(" ")}
      aria-label={i18n.t(I18nKey.APPS$STUDIO_CONVERSATIONS)}
      onClick={onCollapsedRailClick}
    >
      <div className="arco-sidenav__brand-row">
        <StudioLogoMark className="arco-sidenav__brand" title="" />
        {onToggleCollapsed ? (
          <button
            type="button"
            className="arco-btn arco-btn--icon arco-sidenav__collapse"
            onClick={onToggleCollapsed}
            aria-pressed={collapsed}
            aria-label={
              collapsed
                ? i18n.t(I18nKey.APPS$STUDIO_SHOW_CONVERSATIONS)
                : i18n.t(I18nKey.APPS$STUDIO_HIDE_CONVERSATIONS)
            }
            title={
              collapsed
                ? i18n.t(I18nKey.APPS$STUDIO_SHOW_CONVERSATIONS)
                : i18n.t(I18nKey.APPS$STUDIO_HIDE_CONVERSATIONS)
            }
          >
            {collapsed ? <ChevronRight size={14} /> : <PanelLeft size={14} />}
          </button>
        ) : null}
      </div>

      <div className="arco-sidenav__header">
        <button
          className="arco-btn arco-sidenav__primary"
          onClick={onNewChat}
          aria-label={i18n.t(I18nKey.APPS$STUDIO_NEW_CHAT)}
          title={i18n.t(I18nKey.APPS$STUDIO_NEW_CHAT)}
        >
          <Plus size={14} />
          {!collapsed ? <T k={I18nKey.APPS$STUDIO_NEW_CHAT} /> : null}
        </button>
        <div className="arco-sidenav__quicklinks">
          <button
            type="button"
            className="arco-sidenav__quicklink"
            aria-pressed={searchOpen}
            aria-label={i18n.t(I18nKey.COMMON$SEARCH)}
            title={i18n.t(I18nKey.COMMON$SEARCH)}
            onClick={() => {
              if (collapsed) {
                onToggleCollapsed?.();
                setSearchOpen(true);
                return;
              }
              setSearchOpen((v) => !v);
              setQuery("");
            }}
          >
            <Search size={14} />
            {!collapsed ? <T k={I18nKey.COMMON$SEARCH} /> : null}
          </button>
          <button
            type="button"
            className="arco-sidenav__quicklink"
            aria-pressed={mainSurface === "board"}
            aria-label={i18n.t(I18nKey.OS$APP_BOARD)}
            title={i18n.t(I18nKey.OS$APP_BOARD)}
            onClick={() => onSelectBoard?.()}
          >
            <Columns3 size={14} />
            {!collapsed ? <T k={I18nKey.OS$APP_BOARD} /> : null}
          </button>
          <button
            type="button"
            className="arco-sidenav__quicklink"
            aria-label={i18n.t(I18nKey.APPS$STUDIO_SKILLS)}
            title={i18n.t(I18nKey.APPS$STUDIO_SKILLS)}
            onClick={() => openSystem("skills")}
          >
            <Layers size={14} />
            {!collapsed ? <T k={I18nKey.APPS$STUDIO_SKILLS} /> : null}
          </button>
          <button
            type="button"
            className="arco-sidenav__quicklink"
            aria-label={i18n.t(I18nKey.APPS$STUDIO_SCHEDULED)}
            title={i18n.t(I18nKey.APPS$STUDIO_SCHEDULED)}
            onClick={() => openSystem("automations")}
          >
            <Calendar size={14} />
            {!collapsed ? <T k={I18nKey.APPS$STUDIO_SCHEDULED} /> : null}
          </button>
          <button
            type="button"
            className="arco-sidenav__quicklink"
            aria-label={i18n.t(I18nKey.APPS$STUDIO_PLUGINS)}
            title={i18n.t(I18nKey.APPS$STUDIO_PLUGINS)}
            onClick={() => openApisApp("marketplace")}
          >
            <LayoutGrid size={14} />
            {!collapsed ? <T k={I18nKey.APPS$STUDIO_PLUGINS} /> : null}
          </button>
        </div>
        {!collapsed && searchOpen ? (
          <input
            className="arco-input"
            placeholder={i18n.t(I18nKey.APPS$STUDIO_SEARCH_CONVERSATIONS)}
            aria-label={i18n.t(I18nKey.APPS$MESSENGER_SEARCH_CONVERSATIONS)}
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
        ) : null}
      </div>

      {!collapsed ? (
        <>
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

          <div className="arco-sidenav__sectionheader arco-sidenav__sectionheader--fixed">
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

          <div className="arco-sidenav__scroll arco-scroll">
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
        </>
      ) : null}

      {user && (
        <div className="arco-sidenav__footer" title={`${user.displayName} · ${user.role}`}>
          <span className="arco-sidenav__avatar" aria-hidden="true">
            {initials(user.displayName)}
          </span>
          {!collapsed ? (
            <span className="arco-sidenav__userbody">
              <span className="arco-sidenav__username">{user.displayName}</span>
              <span className="arco-sidenav__usermeta">{user.role}</span>
            </span>
          ) : null}
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
  const unread = useUnreadSessionsStore((s) => s.isUnread(session.id));
  const toggleUnread = useUnreadSessionsStore((s) => s.toggleUnread);
  const clearUnread = useUnreadSessionsStore((s) => s.clearUnread);

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
      id: "unread",
      label: unread ? "Mark as read" : "Mark as unread",
      onSelect: () => toggleUnread(session.id),
    },
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
        unread && "arco-studio__session--unread",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="arco-sidenav__itembody"
        aria-current={active || undefined}
        onClick={() => {
          clearUnread(session.id);
          onSelect(session.id);
        }}
      >
        {unread ? <span className="arco-studio__unread-dot" aria-label="Unread" /> : null}
        <span className="arco-sidenav__itemtitle">
          {session.kind === "automation" ? "⚙ " : ""}
          {session.title}
        </span>
      </button>
      <div className="arco-sidenav__itemactions">
        <span className="arco-sidenav__itemtime">{relativeTime(session.updatedAt)}</span>
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
