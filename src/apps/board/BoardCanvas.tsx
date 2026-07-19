import { useCallback, useState } from "react";
import type { BoardColumnId, WorkItem } from "./types";
import { BOARD_COLUMN_LABEL } from "./types";
import { WorkItemCard } from "./WorkItemCard";
import type { BoardViewModel } from "./useBoard";
import { openFullBoard, openWorkItemInStudio, startAgentOnWorkItem } from "./boardActions";

export interface BoardCanvasProps {
  board: BoardViewModel;
  compact?: boolean;
  showOpenFull?: boolean;
  onCreate?: () => void;
}

export function BoardCanvas({ board, compact, showOpenFull, onCreate }: BoardCanvasProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<BoardColumnId | null>(null);

  const handleDrop = useCallback(
    (columnId: BoardColumnId) => {
      if (!draggingId) return;
      const item = board.items.find((entry) => entry.id === draggingId);
      if (item && item.columnId !== columnId) {
        void board.moveItem(draggingId, columnId);
      }
      setDraggingId(null);
      setOverColumn(null);
    },
    [board, draggingId],
  );

  return (
    <div className={["arco-board__canvas", compact ? "arco-board__canvas--compact" : ""].filter(Boolean).join(" ")}>
      {(onCreate || showOpenFull) && (
        <div className="arco-board__toolbar">
          {onCreate ? (
            <button type="button" className="arco-btn arco-btn--primary" onClick={onCreate}>
              New work item
            </button>
          ) : null}
          {showOpenFull ? (
            <button type="button" className="arco-btn" onClick={() => openFullBoard()}>
              Open full board
            </button>
          ) : null}
        </div>
      )}

      {board.error ? <div className="arco-board__error">{board.error}</div> : null}
      {board.loading && board.items.length === 0 ? (
        <div className="arco-board__empty">Loading board…</div>
      ) : null}

      <div className="arco-board__columns arco-scroll">
        {board.columns.map((column) => (
          <section
            key={column.id}
            className={[
              "arco-board__column",
              overColumn === column.id ? "arco-board__column--over" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onDragOver={(event) => {
              event.preventDefault();
              setOverColumn(column.id);
            }}
            onDragLeave={() => {
              setOverColumn((current) => (current === column.id ? null : current));
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(column.id);
            }}
          >
            <header className="arco-board__column-head">
              <h2 className="arco-board__column-title">{BOARD_COLUMN_LABEL[column.id]}</h2>
              <span className="arco-board__column-count">{column.items.length}</span>
            </header>
            <div className="arco-board__column-body">
              {column.items.map((item) => (
                <WorkItemCard
                  key={item.id}
                  item={item}
                  sessions={board.linkedSessionsFor(item)}
                  selected={board.selectedId === item.id}
                  compact={compact}
                  onSelect={board.setSelectedId}
                  onOpenStudio={openWorkItemInStudio}
                  onStartAgent={startAgentOnWorkItem}
                  onDelete={compact ? undefined : (id) => void board.deleteItem(id)}
                  dragHandlers={{
                    draggable: true,
                    onDragStart: () => setDraggingId(item.id),
                    onDragEnd: () => {
                      setDraggingId(null);
                      setOverColumn(null);
                    },
                  }}
                />
              ))}
              {column.items.length === 0 ? (
                <div className="arco-board__column-empty">Drop cards here</div>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Convenience re-export for callers that only need the item type. */
export type { WorkItem };
