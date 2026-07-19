import { I18nKey } from "../i18n/declaration";
import i18n from "../i18n/index";
import { T } from "../i18n/T";
/**
 * Left nav rail — a far-left column for switching between apps. Collapsed it
 * is a 56px icon strip with hover tooltips; expanded it shows icon + label
 * rows. The expand toggle hides behind the brand mark on hover (collapsed)
 * or sits beside it (expanded).
 *
 * Which apps show here (and in what order) is independent from the Dock —
 * each app can be pinned/removed per surface. Drag to reorder, or drag an
 * item off the rail (macOS Dock-style) to unpin it; left-click (or right-click)
 * opens the same app hovercard as the dock. "More apps" lists every app with
 * a checkmark for what's currently pinned, so anything can be added back.
 */
import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Menu } from "../components/Menu";
import { useOsStore } from "./osStore";
import { useWindowStore } from "./windowStore";
import { activateShellWindow } from "./shellNavigation";
import { useShellApps, type ShellAppEntry } from "./shellApps";
import { addPinned, normalizePinned, removePinned, reorderPinned, splitByPinned } from "./pinnedApps";
import { useAppPinDrag } from "./useAppPinDrag";
import { NavBrandMark } from "./NavBrandMark";
import { AppHoverCard } from "./AppHoverCard";
import { appHoverCardHandlers } from "./appHoverCardHandlers";

function NavItem({
  entry,
  active,
  open,
  expanded,
  isDragging,
  isUndocking,
  dropBefore,
  dragHandlers,
  onSelect,
  onRemove,
  windows,
}: {
  entry: ShellAppEntry;
  active: boolean;
  open: boolean;
  expanded: boolean;
  isDragging: boolean;
  isUndocking: boolean;
  dropBefore: boolean;
  dragHandlers: ReturnType<ReturnType<typeof useAppPinDrag>["dragHandlers"]>;
  onSelect: () => void;
  onRemove: () => void;
  windows: ReturnType<typeof useWindowStore.getState>["windows"];
}) {
  const Icon = entry.icon;
  const label = entry.title;
  const focus = useWindowStore((s) => s.focus);
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize);
  const close = useWindowStore((s) => s.close);
  const openWindowCount = windows.filter((w) => w.id === entry.id && !w.minimized).length;

  return (
    <div
      className={[
        "arco-navrail__itemslot",
        isDragging && "arco-navrail__itemslot--dragging",
        isDragging && isUndocking && "arco-navrail__itemslot--undocking",
        dropBefore && "arco-navrail__itemslot--drop-before",
      ]
        .filter(Boolean)
        .join(" ")}
      {...dragHandlers}
    >
      <AppHoverCard
        appId={entry.id}
        label={label}
        icon={Icon}
        running={open}
        active={active}
        openWindowCount={openWindowCount}
        placement="right"
        openOn="click"
        removeLabel="Remove from Nav"
        disabled={isDragging}
        {...appHoverCardHandlers(entry.id, windows, {
          onLaunch: onSelect,
          onFocus: focus,
          onMinimize: toggleMinimize,
          onClose: close,
          onRemove,
        })}
      >
        <button
          className={[
            "arco-navrail__item",
            active && "arco-navrail__item--active",
            entry.generated && "arco-navrail__item--generated",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label={label}
          title={label}
          aria-current={active ? "true" : undefined}
        >
          <span className="arco-navrail__item-icon" aria-hidden="true">
            <Icon size={18} strokeWidth={1.8} />
            {open && !expanded && <span className="arco-navrail__indicator" />}
          </span>
          {expanded ? (
            <>
              <span className="arco-navrail__item-label">{label}</span>
              {open && <span className="arco-navrail__indicator arco-navrail__indicator--inline" />}
            </>
          ) : (
            <span className="arco-navrail__tooltip">{label}</span>
          )}
          {isDragging && isUndocking && (
            <span className="arco-navrail__undock-badge" aria-hidden="true">
              <Trash2 size={12} />
            </span>
          )}
        </button>
      </AppHoverCard>
    </div>
  );
}

export function NavRail() {
  const expanded = useOsStore((s) => s.navExpanded);
  const visible = useOsStore((s) => s.navVisible);
  const setExpanded = useOsStore((s) => s.setNavExpanded);
  const navPinnedIds = useOsStore((s) => s.navPinnedIds);
  const setNavPinnedIds = useOsStore((s) => s.setNavPinnedIds);
  const entries = useShellApps();
  const windows = useWindowStore((s) => s.windows);
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setNavPinnedIds((prev) => normalizePinned(prev, entries.map((e) => e.id)));
  }, [entries, setNavPinnedIds]);

  const { pinned } = splitByPinned(navPinnedIds, entries);
  const pinnedIdSet = new Set(navPinnedIds);
  const { draggingId, overIndex, isUndocking, dragHandlers } = useAppPinDrag({
    containerRef: railRef,
    onReorder: (from, to) => setNavPinnedIds((prev) => reorderPinned(prev, from, to)),
    onRemove: (from) => {
      const id = pinned[from]?.id;
      if (id) setNavPinnedIds((prev) => removePinned(prev, id));
    },
  });

  const focusedId = [...windows.filter((w) => !w.minimized)].sort((a, b) => b.z - a.z)[0]?.id;
  const isOpen = (key: string) => windows.some((w) => w.id === key);

  return (
    <nav
      ref={railRef}
      className={[
        "arco-navrail",
        expanded && "arco-navrail--expanded",
        !visible && "arco-navrail--hidden",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={i18n.t(I18nKey.APPS$LIBRARY_APPS)}
      aria-hidden={!visible}
      inert={!visible || undefined}
    >
      <div className="arco-navrail__brand-row">
        <NavBrandMark />
        <button
          className="arco-navrail__toggle"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-pressed={expanded}
        >
          {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      <div className="arco-navrail__items">
        {pinned.map((entry, index) => (
          <NavItem
            key={entry.id}
            entry={entry}
            active={focusedId === entry.id}
            open={isOpen(entry.id)}
            expanded={expanded}
            isDragging={draggingId === entry.id}
            isUndocking={isUndocking}
            dropBefore={draggingId !== null && draggingId !== entry.id && overIndex === index}
            dragHandlers={dragHandlers(entry.id, index)}
            onSelect={() => activateShellWindow(entry.kind, entry.title, isOpen(entry.id))}
            onRemove={() => setNavPinnedIds((prev) => removePinned(prev, entry.id))}
            windows={windows}
          />
        ))}
      </div>

      <div className="arco-navrail__footer">
        <Menu
          className="arco-navrail__more-apps"
          side="right"
          trigger={
            <button className="arco-navrail__item arco-navrail__item--add" aria-label={i18n.t(I18nKey.OS_NAVRAIL_MORE_APPS)}>
              <span className="arco-navrail__item-icon">
                <Plus size={18} strokeWidth={1.8} />
              </span>
              {expanded ? (
                <span className="arco-navrail__item-label"><T k={I18nKey.OS_NAVRAIL_MORE_APPS} /></span>
              ) : (
                <span className="arco-navrail__tooltip"><T k={I18nKey.OS_NAVRAIL_MORE_APPS} /></span>
              )}
            </button>
          }
          aria-label={i18n.t(I18nKey.OS_NAVRAIL_MORE_APPS)}
          searchPlaceholder={i18n.t(I18nKey.APPS$LIBRARY_SEARCH_APPS)}
          items={entries.map((entry) => ({
            id: entry.id,
            label: entry.title,
            icon: entry.icon,
            keywords: [entry.title, entry.id],
            checked: pinnedIdSet.has(entry.id),
            onSelect: () =>
              setNavPinnedIds((prev) =>
                pinnedIdSet.has(entry.id) ? removePinned(prev, entry.id) : addPinned(prev, entry.id),
              ),
          }))}
        />
      </div>
    </nav>
  );
}
