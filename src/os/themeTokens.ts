/** Shell appearance presets — applied via html data attributes. */

export type AccentPreset = "blue" | "violet" | "green" | "amber" | "rose" | "cyan" | "monochrome";

export type RadiusPreset = "sharp" | "default" | "round" | "soft";

export type FontPreset = "system" | "inter" | "ibm-plex" | "source-serif" | "space-grotesk";

export type TextScalePreset = "compact" | "default" | "comfortable" | "large";

export type SpacingPreset = "compact" | "default" | "comfortable" | "spacious";

/** macOS-style colored dots vs Windows-style icon buttons (Longformer WindowFrame). */
export type WindowControlStyle = "traffic" | "glyph";

/** Where window close/minimize/maximize controls sit in the title bar. */
export type WindowControlAlign = "left" | "right";

export const ACCENT_PRESET_STORAGE_KEY = "arco:accent-preset";
export const RADIUS_PRESET_STORAGE_KEY = "arco:radius-preset";
export const FONT_PRESET_STORAGE_KEY = "arco:font-preset";
export const TEXT_SCALE_PRESET_STORAGE_KEY = "arco:text-scale-preset";
export const SPACING_PRESET_STORAGE_KEY = "arco:spacing-preset";
export const WINDOW_CONTROL_STYLE_STORAGE_KEY = "arco:window-control-style";
export const WINDOW_CONTROL_ALIGN_STORAGE_KEY = "arco:window-control-align";

export interface AccentPresetOption {
  id: AccentPreset;
  label: string;
  /** Swatch fill in Settings — null renders a black/white split preview. */
  preview: string | null;
}

export interface RadiusPresetOption {
  id: RadiusPreset;
  label: string;
}

export const ACCENT_PRESET_OPTIONS: AccentPresetOption[] = [
  { id: "blue", label: "Blue", preview: "#5b82ff" },
  { id: "violet", label: "Violet", preview: "#8b5cf6" },
  { id: "green", label: "Green", preview: "#38b2ac" },
  { id: "amber", label: "Amber", preview: "#ed8936" },
  { id: "rose", label: "Rose", preview: "#ed64a6" },
  { id: "cyan", label: "Cyan", preview: "#4299e1" },
  { id: "monochrome", label: "Monochrome", preview: null },
];

export const RADIUS_PRESET_OPTIONS: RadiusPresetOption[] = [
  { id: "sharp", label: "Sharp" },
  { id: "default", label: "Default" },
  { id: "round", label: "Round" },
  { id: "soft", label: "Soft" },
];

export interface FontPresetOption {
  id: FontPreset;
  label: string;
  /** CSS font-family stack for Settings preview swatches. */
  family: string;
}

export interface ScalePresetOption<T extends string> {
  id: T;
  label: string;
}

export const FONT_PRESET_OPTIONS: FontPresetOption[] = [
  {
    id: "system",
    label: "System",
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  { id: "inter", label: "Inter", family: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  {
    id: "ibm-plex",
    label: "IBM Plex",
    family: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: "source-serif",
    label: "Source Serif",
    family: '"Source Serif 4", "Iowan Old Style", "Palatino Linotype", serif',
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    family: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
];

export const TEXT_SCALE_PRESET_OPTIONS: ScalePresetOption<TextScalePreset>[] = [
  { id: "compact", label: "Compact" },
  { id: "default", label: "Default" },
  { id: "comfortable", label: "Comfortable" },
  { id: "large", label: "Large" },
];

export const SPACING_PRESET_OPTIONS: ScalePresetOption<SpacingPreset>[] = [
  { id: "compact", label: "Compact" },
  { id: "default", label: "Default" },
  { id: "comfortable", label: "Comfortable" },
  { id: "spacious", label: "Spacious" },
];

export const WINDOW_CONTROL_STYLE_OPTIONS: ScalePresetOption<WindowControlStyle>[] = [
  { id: "traffic", label: "Traffic lights" },
  { id: "glyph", label: "Glyph buttons" },
];

export const WINDOW_CONTROL_ALIGN_OPTIONS: ScalePresetOption<WindowControlAlign>[] = [
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
];

const ACCENT_IDS = new Set(ACCENT_PRESET_OPTIONS.map((option) => option.id));
const RADIUS_IDS = new Set(RADIUS_PRESET_OPTIONS.map((option) => option.id));
const FONT_IDS = new Set(FONT_PRESET_OPTIONS.map((option) => option.id));
const TEXT_SCALE_IDS = new Set(TEXT_SCALE_PRESET_OPTIONS.map((option) => option.id));
const SPACING_IDS = new Set(SPACING_PRESET_OPTIONS.map((option) => option.id));
const WINDOW_CONTROL_STYLE_IDS = new Set(WINDOW_CONTROL_STYLE_OPTIONS.map((option) => option.id));
const WINDOW_CONTROL_ALIGN_IDS = new Set(WINDOW_CONTROL_ALIGN_OPTIONS.map((option) => option.id));

export function normalizeAccentPreset(raw: string | null): AccentPreset {
  if (raw && ACCENT_IDS.has(raw as AccentPreset)) return raw as AccentPreset;
  return "blue";
}

export function normalizeRadiusPreset(raw: string | null): RadiusPreset {
  if (raw && RADIUS_IDS.has(raw as RadiusPreset)) return raw as RadiusPreset;
  return "default";
}

export function normalizeFontPreset(raw: string | null): FontPreset {
  if (raw && FONT_IDS.has(raw as FontPreset)) return raw as FontPreset;
  return "system";
}

export function normalizeTextScalePreset(raw: string | null): TextScalePreset {
  if (raw && TEXT_SCALE_IDS.has(raw as TextScalePreset)) return raw as TextScalePreset;
  return "default";
}

export function normalizeSpacingPreset(raw: string | null): SpacingPreset {
  if (raw && SPACING_IDS.has(raw as SpacingPreset)) return raw as SpacingPreset;
  return "default";
}

export function normalizeWindowControlStyle(raw: string | null): WindowControlStyle {
  if (raw && WINDOW_CONTROL_STYLE_IDS.has(raw as WindowControlStyle)) return raw as WindowControlStyle;
  return "traffic";
}

export function normalizeWindowControlAlign(raw: string | null): WindowControlAlign {
  if (raw && WINDOW_CONTROL_ALIGN_IDS.has(raw as WindowControlAlign)) return raw as WindowControlAlign;
  return "left";
}

/** Apply accent preset on the document root (also used for pre-paint hydration). */
export function applyAccentPreset(preset: AccentPreset): void {
  const root = document.documentElement;
  if (preset === "blue") delete root.dataset.accent;
  else root.dataset.accent = preset;
}

/** Apply corner-radius preset on the document root (also used for pre-paint hydration). */
export function applyRadiusPreset(preset: RadiusPreset): void {
  const root = document.documentElement;
  if (preset === "default") delete root.dataset.radius;
  else root.dataset.radius = preset;
}

/** Apply UI font preset on the document root (also used for pre-paint hydration). */
export function applyFontPreset(preset: FontPreset): void {
  const root = document.documentElement;
  if (preset === "system") delete root.dataset.font;
  else root.dataset.font = preset;
}

/** Apply text-size scale on the document root (also used for pre-paint hydration). */
export function applyTextScalePreset(preset: TextScalePreset): void {
  const root = document.documentElement;
  if (preset === "default") delete root.dataset.textScale;
  else root.dataset.textScale = preset;
}

/** Apply spacing/padding scale on the document root (also used for pre-paint hydration). */
export function applySpacingPreset(preset: SpacingPreset): void {
  const root = document.documentElement;
  if (preset === "default") delete root.dataset.spacing;
  else root.dataset.spacing = preset;
}

export function applyThemeTokens(
  accent: AccentPreset,
  radius: RadiusPreset,
  font: FontPreset = "system",
  textScale: TextScalePreset = "default",
  spacing: SpacingPreset = "default",
): void {
  applyAccentPreset(accent);
  applyRadiusPreset(radius);
  applyFontPreset(font);
  applyTextScalePreset(textScale);
  applySpacingPreset(spacing);
}
