/** Shared interop types for Docs / Sheets / Slides format bridges. */

export type DocFormat = "json" | "markdown" | "html" | "odt" | "docx";
export type SheetFormat = "json" | "csv" | "tsv" | "ods" | "xlsx";
export type SlidesFormat = "json" | "html" | "odp" | "pptx" | "pdf";

export interface InteropAsset {
  /** Suggested file name for a sibling Drive blob. */
  name: string;
  mimeType: string;
  /** Base64-encoded bytes. */
  contentBase64: string;
  /** Id referenced from TipTap image attrs after import (client assigns). */
  localId?: string;
}

export interface ImportResult<T> {
  content: T;
  warnings: string[];
  assets: InteropAsset[];
  /** Original package bytes as base64 when the source was a ZIP-based office format. */
  sourcePackageBase64?: string;
}

export interface ExportResult {
  bytes: Uint8Array;
  mimeType: string;
  filenameExt: string;
  warnings: string[];
}

/** TipTap-compatible document JSON (plain, no TipTap dependency). */
export interface DocNode {
  type?: string;
  content?: DocNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

export interface SheetCell {
  value?: string | number;
  formula?: string;
  format?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    align?: "left" | "center" | "right";
    numberFormat?: "plain" | "currency" | "percent";
    fill?: "none" | "muted" | "accent";
  };
}

export interface SheetTab {
  id: string;
  name: string;
  cells: Record<string, SheetCell>;
}

export interface WorkbookDoc {
  version: number;
  title?: string;
  sheets: SheetTab[];
}

export type SlideShapeKind = "rect" | "ellipse" | "triangle" | "line" | "diamond";

export interface SlideBox {
  id: string;
  kind: "text" | "image" | "shape";
  x: number;
  y: number;
  w: number;
  h: number;
  /** TipTap JSON for text boxes; URL/data-URL for images. */
  content?: DocNode | string;
  /** Fill color for shapes (and optional text-box background). */
  fill?: string;
  /** Stroke/border color for shapes and text boxes. */
  stroke?: string;
  strokeWidth?: number;
  /** Text color for text boxes. */
  color?: string;
  textAlign?: "left" | "center" | "right";
  /** Geometry for shape boxes; defaults to rect. */
  shape?: SlideShapeKind;
  /** Shared id when boxes are grouped together. */
  groupId?: string;
}

export interface Slide {
  id: string;
  boxes: SlideBox[];
  notes?: string;
}

export interface DeckDoc {
  version: number;
  title?: string;
  /** Fixed canvas ratio width/height in px units used by the editor. */
  width: number;
  height: number;
  slides: Slide[];
}

export const EMPTY_DECK: DeckDoc = {
  version: 1,
  title: "Untitled presentation",
  width: 960,
  height: 540,
  slides: [{ id: "slide-1", boxes: [] }],
};
