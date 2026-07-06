/**
 * Native HTML5 drag-and-drop for a pinned app list — immediate drag (no
 * hold delay), used identically by NavRail (vertical) and Dock (horizontal).
 * Dragging an item back inside the list reorders it; dragging it far enough
 * outside the rail/dock (macOS Dock-style "pull off to remove") unpins it.
 */
import { useCallback, useState, type RefObject } from "react";

/** How far outside the container's bounds (px) counts as "pulled off". */
const UNDOCK_THRESHOLD_PX = 48;

export interface UseAppPinDragOptions {
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (fromIndex: number) => void;
  /** The nav rail / dock element — dragging past this by the threshold undocks. */
  containerRef: RefObject<HTMLElement | null>;
}

function distanceOutside(rect: DOMRect, x: number, y: number): number {
  const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
  const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
  return Math.hypot(dx, dy);
}

export function useAppPinDrag({ onReorder, onRemove, containerRef }: UseAppPinDragOptions) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [fromIndex, setFromIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [isUndocking, setIsUndocking] = useState(false);

  const reset = useCallback(() => {
    setDraggingId(null);
    setFromIndex(null);
    setOverIndex(null);
    setIsUndocking(false);
  }, []);

  const dragHandlers = useCallback(
    (id: string, index: number) => ({
      draggable: true,
      onDragStart: (event: React.DragEvent) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
        setDraggingId(id);
        setFromIndex(index);
        setOverIndex(index);
      },
      onDrag: (event: React.DragEvent) => {
        // Some browsers fire a spurious final drag tick with clientX/Y == 0;
        // ignore it so the undocking state doesn't flicker right before drop.
        if (event.clientX === 0 && event.clientY === 0) return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setIsUndocking(distanceOutside(rect, event.clientX, event.clientY) > UNDOCK_THRESHOLD_PX);
      },
      onDragOver: (event: React.DragEvent) => {
        if (fromIndex === null) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (overIndex !== index) setOverIndex(index);
      },
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
      },
      onDragEnd: () => {
        if (fromIndex !== null) {
          if (isUndocking) onRemove(fromIndex);
          else if (overIndex !== null && overIndex !== fromIndex) onReorder(fromIndex, overIndex);
        }
        reset();
      },
    }),
    [fromIndex, overIndex, isUndocking, onReorder, onRemove, containerRef, reset],
  );

  return { draggingId, overIndex, isUndocking, dragHandlers };
}
