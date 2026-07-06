export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  align?: "left" | "center" | "right";
  numberFormat?: "plain" | "currency" | "percent";
  fill?: "none" | "muted" | "accent";
}

export interface Cell {
  value?: string | number;
  formula?: string;
  format?: CellFormat;
}

export type SheetCells = Record<string, Cell>;

export interface Sheet {
  id: string;
  name: string;
  cells: SheetCells;
}

export interface Workbook {
  id: string;
  title: string;
  starred?: boolean;
  shared?: boolean;
  meta?: string;
  owner?: string;
  sheets: Sheet[];
}

export interface CellSelection {
  col: number;
  row: number;
}

export type SheetsLocation = "home" | "recent" | "starred" | "shared";

export const DEFAULT_COLUMN_COUNT = 18;
export const DEFAULT_ROW_COUNT = 48;
export const DEFAULT_COLUMN_WIDTH = 96;
export const ROW_HEADER_WIDTH = 46;
export const COLUMN_HEADER_HEIGHT = 24;

export const SHEETS_MENU_ITEMS = [
  "File",
  "Edit",
  "View",
  "Insert",
  "Format",
  "Data",
  "Tools",
  "Extensions",
  "Help",
] as const;

export const SHEETS_TOOLBAR_GROUPS: {
  id: string;
  items: { id: string; label: string }[];
}[] = [
  {
    id: "history",
    items: [
      { id: "undo", label: "Undo" },
      { id: "redo", label: "Redo" },
    ],
  },
  {
    id: "numbers",
    items: [
      { id: "currency", label: "Format as currency" },
      { id: "percent", label: "Format as percent" },
    ],
  },
  {
    id: "text",
    items: [
      { id: "bold", label: "Bold" },
      { id: "italic", label: "Italic" },
      { id: "strikethrough", label: "Strikethrough" },
    ],
  },
  {
    id: "align",
    items: [
      { id: "align-left", label: "Align left" },
      { id: "align-center", label: "Align center" },
      { id: "align-right", label: "Align right" },
    ],
  },
];

export function columnLabel(index: number): string {
  let label = "";
  let value = index;
  while (value >= 0) {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  }
  return label;
}

export function cellAddress(col: number, row: number): string {
  return `${columnLabel(col)}${row + 1}`;
}

export function formatCellDisplay(cell: Cell | undefined): string {
  if (!cell) return "";
  const raw = cell.formula?.startsWith("=") ? cell.formula : String(cell.value ?? "");
  const format = cell.format?.numberFormat ?? "plain";

  if (format === "currency" && raw && !raw.startsWith("=")) {
    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(numeric);
    }
  }

  if (format === "percent" && raw && !raw.startsWith("=")) {
    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
      return `${numeric}%`;
    }
  }

  return raw;
}
