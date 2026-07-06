/** Persisted assistant-face background color (Settings → Appearance). */

export type FaceBgValue = "mono" | "accent" | (string & {});

export const FACE_BG_STORAGE_KEY = "arco:face-bg";

export interface FaceBgOption {
  id: FaceBgValue;
  label: string;
  /** Swatch fill; null renders a monochrome gradient preview. */
  preview: string | null;
}

export const FACE_BG_OPTIONS: FaceBgOption[] = [
  { id: "mono", label: "Monochrome", preview: null },
  { id: "accent", label: "Accent", preview: "var(--arco-accent)" },
  { id: "#6d7585", label: "Slate", preview: "#6d7585" },
  { id: "#7c9dff", label: "Blue", preview: "#7c9dff" },
  { id: "#58c98b", label: "Mint", preview: "#58c98b" },
  { id: "#e5b567", label: "Amber", preview: "#e5b567" },
  { id: "#e5737d", label: "Rose", preview: "#e5737d" },
];

const PRESET_IDS = new Set(FACE_BG_OPTIONS.map((option) => option.id));

export function normalizeFaceBg(raw: string | null): FaceBgValue {
  if (!raw || raw === "mono") return "mono";
  return raw;
}

export function isCustomFaceBg(value: FaceBgValue): boolean {
  return value !== "mono" && value !== "accent" && !PRESET_IDS.has(value);
}

/** Apply face color tokens on the document root (also used for pre-paint hydration). */
export function applyFaceBg(value: FaceBgValue): void {
  const root = document.documentElement;

  if (value === "mono") {
    root.style.removeProperty("--arco-face-bg");
    root.style.removeProperty("--arco-face-feature");
    root.style.removeProperty("--arco-face-pupil");
    root.dataset.faceBg = "mono";
    return;
  }

  if (value === "accent") {
    root.style.setProperty("--arco-face-bg", "var(--arco-accent)");
    root.style.setProperty("--arco-face-feature", "var(--arco-text-inverted)");
    root.style.setProperty("--arco-face-pupil", "var(--arco-bg-desktop)");
    root.dataset.faceBg = "accent";
    return;
  }

  root.style.setProperty("--arco-face-bg", value);
  root.style.setProperty("--arco-face-feature", "#ffffff");
  root.style.setProperty("--arco-face-pupil", "rgba(0, 0, 0, 0.62)");
  root.dataset.faceBg = "custom";
}
