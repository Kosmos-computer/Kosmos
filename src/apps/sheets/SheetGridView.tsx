import { useCallback, useEffect, useRef, useState } from "react";
import {
  cellAddress,
  columnLabel,
  DEFAULT_COLUMN_COUNT,
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_ROW_COUNT,
  COLUMN_HEADER_HEIGHT,
  formatCellDisplay,
  ROW_HEADER_WIDTH,
  type Cell,
  type CellSelection,
  type Sheet,
  type SheetCells,
} from "./types";

function getCell(cells: SheetCells, address: string): Cell | undefined {
  return cells[address];
}

function getCellRawValue(cell: Cell | undefined): string {
  if (!cell) return "";
  if (cell.formula) return cell.formula;
  return String(cell.value ?? "");
}

export function SheetGridView({
  sheet,
  cells,
  selection,
  onSelectionChange,
  onCellChange,
  columnCount = DEFAULT_COLUMN_COUNT,
  rowCount = DEFAULT_ROW_COUNT,
}: {
  sheet: Sheet;
  cells: SheetCells;
  selection: CellSelection;
  onSelectionChange: (selection: CellSelection) => void;
  onCellChange: (address: string, cell: Cell) => void;
  columnCount?: number;
  rowCount?: number;
}) {
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedAddress = cellAddress(selection.col, selection.row);
  const selectedCell = getCell(cells, selectedAddress);

  const commitEdit = useCallback(
    (address: string, rawValue: string) => {
      const trimmed = rawValue.trim();
      const nextCell: Cell = trimmed.startsWith("=")
        ? { value: trimmed, formula: trimmed, format: selectedCell?.format }
        : {
            value: trimmed === "" ? "" : Number.isNaN(Number(trimmed)) ? trimmed : Number(trimmed),
            format: selectedCell?.format,
          };
      onCellChange(address, nextCell);
      setEditingAddress(null);
    },
    [onCellChange, selectedCell?.format],
  );

  useEffect(() => {
    if (editingAddress && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingAddress]);

  function startEditing(address: string) {
    setEditingAddress(address);
    setDraftValue(getCellRawValue(getCell(cells, address)));
  }

  function moveSelection(deltaCol: number, deltaRow: number) {
    onSelectionChange({
      col: Math.max(0, Math.min(columnCount - 1, selection.col + deltaCol)),
      row: Math.max(0, Math.min(rowCount - 1, selection.row + deltaRow)),
    });
  }

  function handleGridKeyDown(event: React.KeyboardEvent) {
    if (editingAddress) return;

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        moveSelection(0, -1);
        break;
      case "ArrowDown":
        event.preventDefault();
        moveSelection(0, 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveSelection(-1, 0);
        break;
      case "ArrowRight":
      case "Tab":
        event.preventDefault();
        moveSelection(1, 0);
        break;
      case "Enter":
        event.preventDefault();
        startEditing(selectedAddress);
        break;
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          setEditingAddress(selectedAddress);
          setDraftValue(event.key);
        }
        break;
    }
  }

  const gridTemplateColumns = `${ROW_HEADER_WIDTH}px repeat(${columnCount}, ${DEFAULT_COLUMN_WIDTH}px)`;

  return (
    <div
      className="arco-sheets__grid-viewport"
      tabIndex={0}
      onKeyDown={handleGridKeyDown}
      aria-label={`${sheet.name} grid`}
    >
      <div className="arco-sheets__grid-scroll arco-scroll">
        <div
          className="arco-sheets__grid-canvas"
          style={{
            gridTemplateColumns,
            gridTemplateRows: `${COLUMN_HEADER_HEIGHT}px repeat(${rowCount}, 24px)`,
          }}
        >
          <div className="arco-sheets__corner-cell" aria-hidden="true" />

          {Array.from({ length: columnCount }, (_, col) => (
            <div
              key={`col-${col}`}
              className={[
                "arco-sheets__column-header",
                selection.col === col ? "arco-sheets__header--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {columnLabel(col)}
            </div>
          ))}

          {Array.from({ length: rowCount }, (_, row) => (
            <div key={`row-${row}`} className="arco-sheets__row-group">
              <div
                className={[
                  "arco-sheets__row-header",
                  selection.row === row ? "arco-sheets__header--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {row + 1}
              </div>

              {Array.from({ length: columnCount }, (_, col) => {
                const address = cellAddress(col, row);
                const cell = getCell(cells, address);
                const isSelected = selection.col === col && selection.row === row;
                const isEditing = editingAddress === address;
                const display = formatCellDisplay(cell);
                const classes = [
                  "arco-sheets__cell",
                  isSelected ? "arco-sheets__cell--selected" : "",
                  cell?.format?.bold ? "arco-sheets__cell--bold" : "",
                  cell?.format?.italic ? "arco-sheets__cell--italic" : "",
                  cell?.format?.strikethrough ? "arco-sheets__cell--strikethrough" : "",
                  cell?.format?.align === "center" ? "arco-sheets__cell--center" : "",
                  cell?.format?.align === "right" ? "arco-sheets__cell--right" : "",
                  cell?.format?.fill === "accent" ? "arco-sheets__cell--accent" : "",
                  cell?.format?.fill === "muted" ? "arco-sheets__cell--muted" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div
                    key={address}
                    className={classes}
                    role="gridcell"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectionChange({ col, row });
                      setEditingAddress(null);
                    }}
                    onDoubleClick={() => startEditing(address)}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        className="arco-sheets__cell-input"
                        value={draftValue}
                        onChange={(event) => setDraftValue(event.target.value)}
                        onBlur={() => commitEdit(address, draftValue)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitEdit(address, draftValue);
                            moveSelection(0, 1);
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            setEditingAddress(null);
                          }
                          if (event.key === "Tab") {
                            event.preventDefault();
                            commitEdit(address, draftValue);
                            moveSelection(1, 0);
                          }
                        }}
                      />
                    ) : (
                      <span className="arco-sheets__cell-text">{display}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
