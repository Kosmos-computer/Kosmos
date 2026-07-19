import i18n from "../i18n/index";
/**
 * The dock — bottom app tray. Which apps show here (and in what order) is
 * independent from the NavRail — each app can be pinned/removed per
 * surface. Drag to reorder, or drag an item off the dock (macOS-style) to
 * unpin it; hover / right-click opens the app hovercard. Pinned icons beyond
 * {@link DOCK_VISIBLE_APP_LIMIT} move to "View all apps"; "More apps" lists
 * every app with a checkmark for what's currently pinned.
 */
import { useEffect, useRef } from "react";
import { LayoutGrid, Plus, Trash2 } from "lucide-react";
import { Menu } from "../components/Menu";
import { I18nKey } from "../i18n/declaration";
import { useOsStore } from "./osStore";
import { useWindowStore } from "./windowStore";
import { activateShellWindow, openNewShellWindow } from "./shellNavigation";
import { useShellApps, type ShellAppEntry } from "./shellApps";
import {
  addPinned,
  DOCK_VISIBLE_APP_LIMIT,
  normalizePinned,
  removePinned,
  reorderPinned,
  splitByPinned,
} from "./pinnedApps";
import { useAppPinDrag } from "./useAppPinDrag";
import { AppHoverCard } from "./AppHoverCard";
import { appHoverCardHandlers, getAppHoverWindowState } from "./appHoverCardHandlers";
import { allowsMultipleWindows, windowMatchesApp } from "./windowStore";

function DockItem({
  entry,
  isDragging,
  isUndocking,
  dropBefore,
  dragHandlers,
  onSelect,
  onRemove,
  windows,
  focusedId,
}: {
  entry: ShellAppEntry;
  isDragging: boolean;
  isUndocking: boolean;
  dropBefore: boolean;
  dragHandlers: ReturnType<ReturnType<typeof useAppPinDrag>["dragHandlers"]>;
  onSelect: () => void;
  onRemove: () => void;
  windows: ReturnType<typeof useWindowStore.getState>["windows"];
  focusedId?: string;
}) {
  const Icon = entry.icon;
  const label = entry.title;
  const focus = useWindowStore((s) => s.focus);
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const close = useWindowStore((s) => s.close);
  const windowState = getAppHoverWindowState(entry.id, windows, focusedId);
  const open = windowState.isOpen;

  return (
    <div
      className={[
        "arco-dock__itemslot",
        isDragging && "arco-dock__itemslot--dragging",
        isDragging && isUndocking && "arco-dock__itemslot--undocking",
        dropBefore && "arco-dock__itemslot--drop-before",
      ]
        .filter(Boolean)
        .join(" ")}
      {...dragHandlers}
    >
      <AppHoverCard
        appId={entry.id}
        label={label}
        icon={Icon}
        windowState={windowState}
        placement="top"
        openOn="hover"
        removeLabel={i18n.t(I18nKey.OS$DOCK_REMOVE)}
        disabled={isDragging}
        {...appHoverCardHandlers(entry.id, windows, {
          onLaunch: onSelect,
          onFocus: focus,
          onMinimize: toggleMinimize,
          onMaximize: toggleMaximize,
          onClose: close,
          onNewWindow: allowsMultipleWindows(entry.kind)
            ? () => openNewShellWindow(entry.kind, entry.title)
            : undefined,
          onRemove,
        })}
      >
        <button
          className={["arco-dock__item", entry.generated && "arco-dock__item--generated"]
            .filter(Boolean)
            .join(" ")}
          onClick={onSelect}
          aria-label={label}
          title={label}
        >
          <span aria-hidden="true">
            <Icon size={22} strokeWidth={1.8} />
          </span>
          {open && <span className="arco-dock__indicator" />}
          <span className="arco-dock__tooltip">{label}</span>
          {isDragging && isUndocking && (
            <span className="arco-dock__undock-badge" aria-hidden="true">
              <Trash2 size={12} />
            </span>
          )}
        </button>
      </AppHoverCard>
    </div>
  );
}

export function Dock() {
  const dockPinnedIds = useOsStore((s) => s.dockPinnedIds);
  const setDockPinnedIds = useOsStore((s) => s.setDockPinnedIds);
  const entries = useShellApps();
  const windows = useWindowStore((s) => s.windows);
  const dockRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setDockPinnedIds((prev) => normalizePinned(prev, entries.map((e) => e.id)));
  }, [entries, setDockPinnedIds]);

  const { pinned } = splitByPinned(dockPinnedIds, entries);
  const pinnedIdSet = new Set(dockPinnedIds);
  const { draggingId, overIndex, isUndocking, dragHandlers } = useAppPinDrag({
    containerRef: dockRef,
    onReorder: (from, to) => setDockPinnedIds((prev) => reorderPinned(prev, from, to)),
    onRemove: (from) => {
      const id = pinned[from]?.id;
      if (id) setDockPinnedIds((prev) => removePinned(prev, id));
    },
  });

  const isOpen = (key: string) => windows.some((w) => windowMatchesApp(w.id, key));
  const focusedId = [...windows.filter((w) => !w.minimized)].sort((a, b) => b.z - a.z)[0]?.id;
  const visiblePinned = pinned.slice(0, DOCK_VISIBLE_APP_LIMIT);
  const overflowPinned = pinned.slice(DOCK_VISIBLE_APP_LIMIT);

  const openApp = (entry: ShellAppEntry) =>
    activateShellWindow(entry.kind, entry.title, isOpen(entry.id));

  return (
    <nav ref={dockRef} className="arco-dock" aria-label={i18n.t(I18nKey.OS_DOCK_DOCK)}>
      <div className="arco-dock__items">
        <div className="arco-dock__items-track">
          {visiblePinned.map((entry, index) => (
            <DockItem
              key={entry.id}
              entry={entry}
              isDragging={draggingId === entry.id}
              isUndocking={isUndocking}
              dropBefore={draggingId !== null && draggingId !== entry.id && overIndex === index}
              dragHandlers={dragHandlers(entry.id, index)}
              onSelect={() => openApp(entry)}
              onRemove={() => setDockPinnedIds((prev) => removePinned(prev, entry.id))}
              windows={windows}
              focusedId={focusedId}
            />
          ))}
        </div>
      </div>

      <div className="arco-dock__actions">
        <Menu
          className="arco-dock__all-apps"
          trigger={
            <button className="arco-dock__item arco-dock__item--all-apps" aria-label={i18n.t(I18nKey.OS$DOCK_VIEW_ALL)}>
              <LayoutGrid size={20} strokeWidth={1.8} />
              {overflowPinned.length > 0 && (
                <span className="arco-dock__overflow-count" aria-hidden="true">
                  {overflowPinned.length}
                </span>
              )}
              <span className="arco-dock__tooltip">{i18n.t(I18nKey.OS$DOCK_VIEW_ALL)}</span>
            </button>
          }
          aria-label={i18n.t(I18nKey.OS$DOCK_VIEW_ALL)}
          searchPlaceholder={i18n.t(I18nKey.APPS$LIBRARY_SEARCH_APPS)}
          side="top"
          align="end"
          items={
            overflowPinned.length > 0
              ? overflowPinned.map((entry) => ({
                  id: entry.id,
                  label: entry.title,
                  icon: entry.icon,
                  keywords: [entry.title, entry.id],
                  onSelect: () => openApp(entry),
                }))
              : [{ id: "empty", label: "All pinned apps are on the tray.", disabled: true }]
          }
        />

        <Menu
          className="arco-dock__more-apps"
          trigger={
            <button className="arco-dock__item arco-dock__item--add" aria-label={i18n.t(I18nKey.OS$DOCK_MORE_APPS)}>
              <Plus size={20} strokeWidth={1.8} />
              <span className="arco-dock__tooltip">{i18n.t(I18nKey.OS$DOCK_MORE_APPS)}</span>
            </button>
          }
          aria-label={i18n.t(I18nKey.OS$DOCK_MORE_APPS)}
          searchPlaceholder={i18n.t(I18nKey.APPS$LIBRARY_SEARCH_APPS)}
          side="top"
          align="end"
          items={entries.map((entry) => ({
            id: entry.id,
            label: entry.title,
            icon: entry.icon,
            keywords: [entry.title, entry.id],
            checked: pinnedIdSet.has(entry.id),
            onSelect: () =>
              setDockPinnedIds((prev) =>
                pinnedIdSet.has(entry.id) ? removePinned(prev, entry.id) : addPinned(prev, entry.id),
              ),
          }))}
        />
      </div>
    </nav>
  );
}
