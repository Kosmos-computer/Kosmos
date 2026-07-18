import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useColumnResize } from "../../components/patterns";
import type { FilesSortBy, FilesSortDir } from "./types";

type DriveColumnKey = "name" | "owner" | "modified" | "size";
type SortableColumn = Extract<FilesSortBy, "name" | "owner" | "modified" | "size">;

interface DriveColumnWidths {
  name: number;
  owner: number;
  modified: number;
  size: number;
}

const DEFAULT_WIDTHS: DriveColumnWidths = {
  name: 280,
  owner: 160,
  modified: 120,
  size: 90,
};

const COLUMN_LIMITS: Record<DriveColumnKey, { min: number; max: number; label: string }> = {
  name: { min: 160, max: 560, label: "Resize Name column" },
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
        "--arco-drive-col-name": `${widths.name}px`,
        "--arco-drive-col-name-min": `${COLUMN_LIMITS.name.min}px`,
        "--arco-drive-col-owner": `${widths.owner}px`,
        "--arco-drive-col-owner-min": `${COLUMN_LIMITS.owner.min}px`,
        "--arco-drive-col-modified": `${widths.modified}px`,
        "--arco-drive-col-modified-min": `${COLUMN_LIMITS.modified.min}px`,
        "--arco-drive-col-size": `${widths.size}px`,
        "--arco-drive-col-size-min": `${COLUMN_LIMITS.size.min}px`,
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
    handleSide: "right",
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
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(event);
      }}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onWidthChange(DEFAULT_WIDTHS[column]);
      }}
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

function HeaderColumn({
  column,
  className,
  widths,
  onColumnWidthChange,
  sortBy,
  sortDir,
  onSort,
  align,
  children,
}: {
  column: DriveColumnKey;
  className: string;
  widths: DriveColumnWidths;
  onColumnWidthChange: (key: DriveColumnKey, next: number) => void;
  sortBy: FilesSortBy;
  sortDir: FilesSortDir;
  onSort: (sortBy: FilesSortBy) => void;
  align?: "start" | "end";
  children: ReactNode;
}) {
  return (
    <span className={className}>
      <SortHeaderButton
        column={column}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        align={align}
      >
        {children}
      </SortHeaderButton>
      <ColumnResizeHandle
        column={column}
        width={widths[column]}
        onWidthChange={(next) => onColumnWidthChange(column, next)}
      />
    </span>
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
      <HeaderColumn
        column="name"
        className="arco-drive__column-header-name"
        widths={widths}
        onColumnWidthChange={onColumnWidthChange}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
      >
        <T k={I18nKey.APPS$FILES_NAME} />
      </HeaderColumn>
      <HeaderColumn
        column="owner"
        className="arco-drive__column-header-owner"
        widths={widths}
        onColumnWidthChange={onColumnWidthChange}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
      >
        <T k={I18nKey.APPS$FILES_OWNER} />
      </HeaderColumn>
      <HeaderColumn
        column="modified"
        className="arco-drive__column-header-modified"
        widths={widths}
        onColumnWidthChange={onColumnWidthChange}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
      >
        <T k={I18nKey.APPS$FILES_LAST_MODIFIED} />
      </HeaderColumn>
      <HeaderColumn
        column="size"
        className="arco-drive__column-header-size"
        widths={widths}
        onColumnWidthChange={onColumnWidthChange}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        align="end"
      >
        <T k={I18nKey.APPS$FILES_FILE_SIZE} />
      </HeaderColumn>
      <span className="arco-drive__column-header-actions" aria-hidden="true" />
    </div>
  );
}
