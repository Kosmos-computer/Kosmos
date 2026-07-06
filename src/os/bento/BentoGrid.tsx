import { useRef } from "react";
import { maxGridRow } from "./grid-utils";
import { BentoTile } from "./BentoTile";
import { BENTO_COLS, BENTO_GAP_PX, BENTO_ROW_HEIGHT_PX, type BentoItem } from "./types";

export interface BentoGridProps {
  items: BentoItem[];
  activeId?: string | null;
  onFocus: (id: string) => void;
  onMove: (id: string, next: Pick<BentoItem, "col" | "row">) => void;
  onResize: (id: string, next: Pick<BentoItem, "col" | "row" | "colSpan" | "rowSpan">) => void;
  className?: string;
}

export function BentoGrid({ items, activeId, onFocus, onMove, onResize, className = "" }: BentoGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const rowCount = maxGridRow(items) + 2;

  return (
    <div className={`arco-bento-grid ${className}`.trim()}>
      <div
        className="arco-bento-grid__background"
        aria-hidden="true"
        style={{
          backgroundSize: `calc((100% - ${BENTO_GAP_PX}px * ${BENTO_COLS - 1}) / ${BENTO_COLS} + ${BENTO_GAP_PX}px) calc(${BENTO_ROW_HEIGHT_PX}px + ${BENTO_GAP_PX}px)`,
        }}
      />
      <div
        ref={gridRef}
        className="arco-bento-grid__cells"
        style={{
          gridTemplateColumns: `repeat(${BENTO_COLS}, minmax(0, 1fr))`,
          gridAutoRows: `${BENTO_ROW_HEIGHT_PX}px`,
          gap: `${BENTO_GAP_PX}px`,
          minHeight: `${rowCount * BENTO_ROW_HEIGHT_PX + (rowCount - 1) * BENTO_GAP_PX}px`,
        }}
      >
        {items.map((item) => (
          <BentoTile
            key={item.id}
            item={item}
            active={activeId === item.id}
            onFocus={onFocus}
            onMove={onMove}
            onResize={onResize}
            gridRef={gridRef}
            allItems={items}
          />
        ))}
      </div>
    </div>
  );
}
