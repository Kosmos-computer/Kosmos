/**
 * The dock — bottom app tray. Which apps show here (and in what order) is
 * independent from the NavRail — each app can be pinned/removed per
 * surface. Drag to reorder, or drag an item off the dock (macOS-style) to
 * unpin it; right-click also offers "Remove from Dock". Pinned icons beyond
 * {@link DOCK_VISIBLE_APP_LIMIT} move to "View all apps"; "More apps" lists
 * every app with a checkmark for what's currently pinned.
 */
import { useEffect, useRef, useState } from "react";
import { LayoutGrid, Plus, Trash2 } from "lucide-react";
import { Menu } from "../components/Menu";
import { useOsStore } from "./osStore";
import { useWindowStore } from "./windowStore";
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

function DockItem({
  entry,
  open,
  isDragging,
  isUndocking,
  dropBefore,
  dragHandlers,
  onSelect,
  onRemove,
}: {
  entry: ShellAppEntry;
  open: boolean;
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
        "arco-dock__itemslot",
        isDragging && "arco-dock__itemslot--dragging",
        isDragging && isUndocking && "arco-dock__itemslot--undocking",
        dropBefore && "arco-dock__itemslot--drop-before",
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
        className={["arco-dock__item", entry.generated && "arco-dock__item--generated"].filter(Boolean).join(" ")}
        onClick={onSelect}
        aria-label={entry.title}
      >
        <Icon size={22} strokeWidth={1.8} />
        {open && <span className="arco-dock__indicator" />}
        <span className="arco-dock__tooltip">{entry.title}</span>
        {isDragging && isUndocking && (
          <span className="arco-dock__undock-badge" aria-hidden="true">
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
        side="top"
        items={[
          { id: "remove", label: "Remove from Dock", icon: Trash2, danger: true, onSelect: onRemove },
        ]}
      />
    </div>
  );
}

export function Dock() {
  const dockPinnedIds = useOsStore((s) => s.dockPinnedIds);
  const setDockPinnedIds = useOsStore((s) => s.setDockPinnedIds);
  const entries = useShellApps();
  const windows = useWindowStore((s) => s.windows);
  const open = useWindowStore((s) => s.open);
  const focus = useWindowStore((s) => s.focus);
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

  const isOpen = (key: string) => windows.some((w) => w.id === key);
  const visiblePinned = pinned.slice(0, DOCK_VISIBLE_APP_LIMIT);
  const overflowPinned = pinned.slice(DOCK_VISIBLE_APP_LIMIT);

  const openApp = (entry: ShellAppEntry) =>
    isOpen(entry.id) ? focus(entry.id) : open(entry.kind, entry.title);

  return (
    <nav ref={dockRef} className="arco-dock" aria-label="Dock">
      <div className="arco-dock__items">
        <div className="arco-dock__items-track">
          {visiblePinned.map((entry, index) => (
            <DockItem
              key={entry.id}
              entry={entry}
              open={isOpen(entry.id)}
              isDragging={draggingId === entry.id}
              isUndocking={isUndocking}
              dropBefore={draggingId !== null && draggingId !== entry.id && overIndex === index}
              dragHandlers={dragHandlers(entry.id, index)}
              onSelect={() => openApp(entry)}
              onRemove={() => setDockPinnedIds((prev) => removePinned(prev, entry.id))}
            />
          ))}
        </div>
      </div>

      <div className="arco-dock__actions">
        <Menu
          className="arco-dock__all-apps"
          trigger={
            <button className="arco-dock__item arco-dock__item--all-apps" aria-label="View all apps">
              <LayoutGrid size={20} strokeWidth={1.8} />
              {overflowPinned.length > 0 && (
                <span className="arco-dock__overflow-count" aria-hidden="true">
                  {overflowPinned.length}
                </span>
              )}
              <span className="arco-dock__tooltip">View all apps</span>
            </button>
          }
          aria-label="View all apps"
          searchPlaceholder="Search apps"
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
            <button className="arco-dock__item arco-dock__item--add" aria-label="More apps">
              <Plus size={20} strokeWidth={1.8} />
              <span className="arco-dock__tooltip">More apps</span>
            </button>
          }
          aria-label="More apps"
          searchPlaceholder="Search apps"
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
