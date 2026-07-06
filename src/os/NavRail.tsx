/**
 * Left nav rail — a far-left column for switching between apps. Collapsed it
 * is a 56px icon strip with hover tooltips; expanded it shows icon + label
 * rows. The expand toggle hides behind the brand mark on hover (collapsed)
 * or sits beside it (expanded).
 *
 * Which apps show here (and in what order) is independent from the Dock —
 * each app can be pinned/removed per surface. Drag to reorder, or drag an
 * item off the rail (macOS Dock-style) to unpin it; right-click also offers
 * "Remove from Nav". "More apps" lists every app with a checkmark for what's
 * currently pinned, so anything can be added back.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Menu } from "../components/Menu";
import { useOsStore } from "./osStore";
import { useWindowStore } from "./windowStore";
import { useShellApps, type ShellAppEntry } from "./shellApps";
import { addPinned, normalizePinned, removePinned, reorderPinned, splitByPinned } from "./pinnedApps";
import { useAppPinDrag } from "./useAppPinDrag";
import { NavBrandMark } from "./NavBrandMark";

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
}) {
  const Icon = entry.icon;
  const [ctxOpen, setCtxOpen] = useState(false);

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
      onContextMenu={(e) => {
        e.preventDefault();
        setCtxOpen(true);
      }}
    >
      <button
        className={[
          "arco-navrail__item",
          active && "arco-navrail__item--active",
          entry.generated && "arco-navrail__item--generated",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onSelect}
        aria-label={entry.title}
        aria-current={active ? "true" : undefined}
      >
        <span className="arco-navrail__item-icon">
          <Icon size={18} strokeWidth={1.8} />
          {open && !expanded && <span className="arco-navrail__indicator" />}
        </span>
        {expanded ? (
          <>
            <span className="arco-navrail__item-label">{entry.title}</span>
            {open && <span className="arco-navrail__indicator arco-navrail__indicator--inline" />}
          </>
        ) : (
          <span className="arco-navrail__tooltip">{entry.title}</span>
        )}
        {isDragging && isUndocking && (
          <span className="arco-navrail__undock-badge" aria-hidden="true">
            <Trash2 size={12} />
          </span>
        )}
      </button>
      <Menu
        open={ctxOpen}
        onOpenChange={setCtxOpen}
        trigger={<span aria-hidden="true" />}
        className="arco-itemctx"
        aria-label={`${entry.title} options`}
        items={[
          { id: "remove", label: "Remove from Nav", icon: Trash2, danger: true, onSelect: onRemove },
        ]}
      />
    </div>
  );
}

export function NavRail() {
  const expanded = useOsStore((s) => s.navExpanded);
  const setExpanded = useOsStore((s) => s.setNavExpanded);
  const navPinnedIds = useOsStore((s) => s.navPinnedIds);
  const setNavPinnedIds = useOsStore((s) => s.setNavPinnedIds);
  const entries = useShellApps();
  const windows = useWindowStore((s) => s.windows);
  const open = useWindowStore((s) => s.open);
  const focus = useWindowStore((s) => s.focus);
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
      className={`arco-navrail ${expanded ? "arco-navrail--expanded" : ""}`}
      aria-label="Apps"
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
            onSelect={() => (isOpen(entry.id) ? focus(entry.id) : open(entry.kind, entry.title))}
            onRemove={() => setNavPinnedIds((prev) => removePinned(prev, entry.id))}
          />
        ))}

        <Menu
          trigger={
            <button className="arco-navrail__item arco-navrail__item--add" aria-label="More apps">
              <span className="arco-navrail__item-icon">
                <Plus size={18} strokeWidth={1.8} />
              </span>
              {expanded ? (
                <span className="arco-navrail__item-label">More apps</span>
              ) : (
                <span className="arco-navrail__tooltip">More apps</span>
              )}
            </button>
          }
          aria-label="More apps"
          items={entries.map((entry) => ({
            id: entry.id,
            label: entry.title,
            icon: entry.icon,
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
