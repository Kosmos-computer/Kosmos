import { BENTO_COLS, type BentoGridMetrics, type BentoItem } from "./types";

export function itemBounds(item: Pick<BentoItem, "col" | "row" | "colSpan" | "rowSpan">) {
  return {
    colStart: item.col,
    colEnd: item.col + item.colSpan - 1,
    rowStart: item.row,
    rowEnd: item.row + item.rowSpan - 1,
  };
}

export function itemsOverlap(
  left: Pick<BentoItem, "col" | "row" | "colSpan" | "rowSpan">,
  right: Pick<BentoItem, "col" | "row" | "colSpan" | "rowSpan">,
) {
  const a = itemBounds(left);
  const b = itemBounds(right);
  return a.colStart <= b.colEnd && a.colEnd >= b.colStart && a.rowStart <= b.rowEnd && a.rowEnd >= b.rowStart;
}

export function isWithinGrid(item: Pick<BentoItem, "col" | "row" | "colSpan" | "rowSpan">, cols = BENTO_COLS) {
  return item.col >= 1 && item.row >= 1 && item.colSpan >= 1 && item.rowSpan >= 1 && item.col + item.colSpan - 1 <= cols;
}

export function canPlaceItem(
  candidate: BentoItem,
  items: BentoItem[],
  excludeId?: string,
  cols = BENTO_COLS,
): boolean {
  if (!isWithinGrid(candidate, cols)) return false;
  return !items.some((item) => item.id !== excludeId && itemsOverlap(candidate, item));
}

export function clampItemToGrid(item: BentoItem, cols = BENTO_COLS): BentoItem {
  const colSpan = Math.max(1, Math.min(item.colSpan, cols));
  const rowSpan = Math.max(1, item.rowSpan);
  const col = Math.max(1, Math.min(item.col, cols - colSpan + 1));
  const row = Math.max(1, item.row);
  return { ...item, col, row, colSpan, rowSpan };
}

export function findNextFreeSpot(
  colSpan: number,
  rowSpan: number,
  items: BentoItem[],
  cols = BENTO_COLS,
  maxRows = 24,
): { col: number; row: number } | null {
  for (let row = 1; row <= maxRows; row += 1) {
    for (let col = 1; col <= cols - colSpan + 1; col += 1) {
      const candidate: BentoItem = {
        id: "__probe__",
        templateId: "__probe__",
        label: "",
        col,
        row,
        colSpan,
        rowSpan,
        content: { kind: "kpi", label: "", value: "" },
      };
      if (canPlaceItem(candidate, items, undefined, cols)) {
        return { col, row };
      }
    }
  }
  return null;
}

export function gridMetricsFromElement(element: HTMLElement, cols = BENTO_COLS): BentoGridMetrics {
  const styles = getComputedStyle(element);
  const gap = Number.parseFloat(styles.gap || styles.columnGap || "8") || 8;
  const rowHeight = Number.parseFloat(styles.gridAutoRows || "48") || 48;
  return { cols, rowHeight, gap, width: element.clientWidth };
}

export function cellSize(metrics: BentoGridMetrics) {
  const cellWidth = (metrics.width - metrics.gap * (metrics.cols - 1)) / metrics.cols;
  return { cellWidth, cellHeight: metrics.rowHeight };
}

export function pointerToGridCell(
  clientX: number,
  clientY: number,
  gridRect: DOMRect,
  metrics: BentoGridMetrics,
): { col: number; row: number } {
  const { cellWidth, cellHeight } = cellSize(metrics);
  const x = clientX - gridRect.left;
  const y = clientY - gridRect.top;
  const col = Math.floor(x / (cellWidth + metrics.gap)) + 1;
  const row = Math.floor(y / (cellHeight + metrics.gap)) + 1;
  return {
    col: Math.max(1, Math.min(col, metrics.cols)),
    row: Math.max(1, row),
  };
}

export function deltaToGridSpan(deltaX: number, deltaY: number, metrics: BentoGridMetrics) {
  const { cellWidth, cellHeight } = cellSize(metrics);
  return {
    dCol: Math.round(deltaX / (cellWidth + metrics.gap)),
    dRow: Math.round(deltaY / (cellHeight + metrics.gap)),
  };
}

export type BentoResizeHandle = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

export function applyResizeDelta(
  start: BentoItem,
  dCol: number,
  dRow: number,
  handle: BentoResizeHandle,
): Pick<BentoItem, "col" | "row" | "colSpan" | "rowSpan"> {
  const eastCol = start.col + start.colSpan - 1;
  const southRow = start.row + start.rowSpan - 1;

  let col = start.col;
  let row = start.row;
  let colSpan = start.colSpan;
  let rowSpan = start.rowSpan;

  if (handle.includes("e")) colSpan = start.colSpan + dCol;
  if (handle.includes("w")) colSpan = start.colSpan - dCol;
  if (handle.includes("s")) rowSpan = start.rowSpan + dRow;
  if (handle.includes("n")) rowSpan = start.rowSpan - dRow;

  colSpan = Math.max(1, colSpan);
  rowSpan = Math.max(1, rowSpan);

  if (handle.includes("w")) col = eastCol - colSpan + 1;
  if (handle.includes("n")) row = southRow - rowSpan + 1;

  return { col, row, colSpan, rowSpan };
}

export function resizeCursor(handle: BentoResizeHandle): string {
  switch (handle) {
    case "n":
    case "s":
      return "ns-resize";
    case "e":
    case "w":
      return "ew-resize";
    case "nw":
    case "se":
      return "nwse-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
  }
}

export function maxGridRow(items: BentoItem[]) {
  if (items.length === 0) return 4;
  return Math.max(...items.map((item) => item.row + item.rowSpan - 1), 4);
}
