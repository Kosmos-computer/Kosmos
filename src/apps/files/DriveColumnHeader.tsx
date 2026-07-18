import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useColumnResize } from "../../components/patterns";
import type { FilesSortBy, FilesSortDir } from "./types";

type DriveColumnKey = "owner" | "modified" | "size";
type SortableColumn = Extract<FilesSortBy, "name" | "owner" | "modified" | "size">;

interface DriveColumnWidths {
  owner: number;
  modified: number;
  size: number;
}

const DEFAULT_WIDTHS: DriveColumnWidths = {
  owner: 160,
  modified: 120,
  size: 90,
};

const COLUMN_LIMITS: Record<DriveColumnKey, { min: number; max: number; label: string }> = {
  owner: { min: 88, max: 280, label: "Resize Owner column" },
  modified: { min: 72, max: 220, label: "Resize Last modified column" },
  size: { min: 56, max: 160, label: "Resize File size column" },
};

export function useDriveColumnWidths() {
  const [widths, setWidths] = useState<DriveColumnWidths>(DEFAULT_WIDTHS);

  const setColumnWidth = useCallback((key: DriveColumnKey, next: number) => {
    setWidths((prev) => (prev[key] === next ? prev : { ...prev, [key]: next }));
  }, []);

  const style = useMemo(
    () =>
      ({
        "--arco-drive-col-owner": `${widths.owner}px`,
        "--arco-drive-col-modified": `${widths.modified}px`,
        "--arco-drive-col-size": `${widths.size}px`,
      }) as CSSProperties,
    [widths],
  );

  return { widths, setColumnWidth, style };
}

function ColumnResizeHandle({
  column,
  width,
  onWidthChange,
}: {
  column: DriveColumnKey;
  width: number;
  onWidthChange: (next: number) => void;
}) {
  const limits = COLUMN_LIMITS[column];
  const { onPointerDown, isResizing } = useColumnResize({
    value: width,
    onChange: onWidthChange,
    min: limits.min,
    max: limits.max,
    handleSide: "left",
  });

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={limits.label}
      aria-valuenow={Math.round(width)}
      aria-valuemin={limits.min}
      aria-valuemax={limits.max}
      tabIndex={0}
      className={["arco-drive__col-resize", isResizing ? "arco-drive__col-resize--active" : ""]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={onPointerDown}
    />
  );
}

function SortHeaderButton({
  column,
  sortBy,
  sortDir,
  onSort,
  className,
  children,
  align = "start",
}: {
  column: SortableColumn;
  sortBy: FilesSortBy;
  sortDir: FilesSortDir;
  onSort: (sortBy: FilesSortBy) => void;
  className?: string;
  children: ReactNode;
  align?: "start" | "end";
}) {
  const active = sortBy === column;
  const SortIcon = sortDir === "asc" ? ChevronUp : ChevronDown;

  return (
    <button
      type="button"
      className={[
        "arco-drive__column-sort",
        align === "end" ? "arco-drive__column-sort--end" : "",
        active ? "arco-drive__column-sort--active" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      onClick={() => onSort(column)}
    >
      <span className="arco-drive__column-sort-label">{children}</span>
      {active ? <SortIcon size={12} strokeWidth={2.25} aria-hidden="true" /> : null}
    </button>
  );
}

export function DriveColumnHeader({
  widths,
  onColumnWidthChange,
  sortBy,
  sortDir,
  onSort,
}: {
  widths: DriveColumnWidths;
  onColumnWidthChange: (key: DriveColumnKey, next: number) => void;
  sortBy: FilesSortBy;
  sortDir: FilesSortDir;
  onSort: (sortBy: FilesSortBy) => void;
}) {
  return (
    <div className="arco-drive__column-header">
      <SortHeaderButton column="name" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="arco-drive__column-header-name">
        <T k={I18nKey.APPS$FILES_NAME} />
      </SortHeaderButton>
      <span className="arco-drive__column-header-owner">
        <ColumnResizeHandle
          column="owner"
          width={widths.owner}
          onWidthChange={(next) => onColumnWidthChange("owner", next)}
        />
        <SortHeaderButton column="owner" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
          <T k={I18nKey.APPS$FILES_OWNER} />
        </SortHeaderButton>
      </span>
      <span className="arco-drive__column-header-modified">
        <ColumnResizeHandle
          column="modified"
          width={widths.modified}
          onWidthChange={(next) => onColumnWidthChange("modified", next)}
        />
        <SortHeaderButton column="modified" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>
          <T k={I18nKey.APPS$FILES_LAST_MODIFIED} />
        </SortHeaderButton>
      </span>
      <span className="arco-drive__column-header-size">
        <ColumnResizeHandle
          column="size"
          width={widths.size}
          onWidthChange={(next) => onColumnWidthChange("size", next)}
        />
        <SortHeaderButton column="size" sortBy={sortBy} sortDir={sortDir} onSort={onSort} align="end">
          <T k={I18nKey.APPS$FILES_FILE_SIZE} />
        </SortHeaderButton>
      </span>
      <span aria-hidden="true" />
    </div>
  );
}
