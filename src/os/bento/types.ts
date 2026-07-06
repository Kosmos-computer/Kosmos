/** Bento grid layout types — ported from Longformer bento workspace semantics. */

import type { BentoCardThemeId } from "./bentoThemes";

export const BENTO_COLS = 12;
export const BENTO_ROW_HEIGHT_PX = 48;
export const BENTO_GAP_PX = 8;

export type BentoLiveKey = "apps" | "sessions" | "automations" | "agent" | "clock";

export type BentoWidgetKind = "kpi" | "stat" | "list" | "clock" | "insight" | "weather" | "music";

export interface BentoWidgetContent {
  kind: BentoWidgetKind;
  /** When set, card content is hydrated from live shell/API data at render time. */
  liveKey?: BentoLiveKey;
  label?: string;
  value?: string;
  meta?: string;
  tone?: "default" | "accent" | "success" | "warning";
  percent?: number;
  title?: string;
  description?: string;
  items?: { label: string; value: string; change?: string; direction?: "up" | "down" }[];
}

export interface BentoItem {
  id: string;
  templateId: string;
  label: string;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
  content: BentoWidgetContent;
  /** Visual shell theme — see bentoThemes.ts and bento-themes.css. */
  theme?: BentoCardThemeId;
}

export interface BentoWidgetTemplate {
  templateId: string;
  label: string;
  colSpan: number;
  rowSpan: number;
  content: BentoWidgetContent;
}

export interface BentoGridMetrics {
  cols: number;
  rowHeight: number;
  gap: number;
  width: number;
}

export interface BentoLiveSnapshot {
  apps: Pick<BentoWidgetContent, "label" | "value" | "meta" | "tone">;
  sessions: Pick<BentoWidgetContent, "label" | "value" | "meta" | "tone">;
  automations: Pick<BentoWidgetContent, "label" | "value" | "meta" | "tone">;
  agent: Pick<BentoWidgetContent, "label" | "value" | "meta" | "tone">;
  clock: Pick<BentoWidgetContent, "label" | "value" | "meta">;
}
