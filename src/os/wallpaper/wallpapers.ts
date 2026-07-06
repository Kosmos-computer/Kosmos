/**
 * Wallpaper catalog — static gradient presets plus live canvas/CSS effects.
 * IDs persist in localStorage via osStore; unknown values fall back to aurora.
 */

export type WallpaperId =
  | "aurora"
  | "dusk"
  | "graphite"
  | "forest"
  | "starfield"
  | "nebula";

export interface WallpaperOption {
  id: WallpaperId;
  label: string;
  /** When true, WallpaperBackdrop mounts a canvas or animated layer. */
  animated?: boolean;
}

export interface WallpaperGroup {
  label: string;
  options: WallpaperOption[];
}

export const WALLPAPER_GROUPS: WallpaperGroup[] = [
  {
    label: "Gradients",
    options: [
      { id: "aurora", label: "Aurora" },
      { id: "dusk", label: "Dusk" },
      { id: "graphite", label: "Graphite" },
      { id: "forest", label: "Forest" },
    ],
  },
  {
    label: "Live effects",
    options: [
      { id: "starfield", label: "Starfield", animated: true },
      { id: "nebula", label: "Nebula", animated: true },
    ],
  },
];

export const WALLPAPER_IDS = WALLPAPER_GROUPS.flatMap((g) => g.options.map((o) => o.id));

const WALLPAPER_SET = new Set<string>(WALLPAPER_IDS);

/** Coerce persisted/localStorage values to a known wallpaper id. */
export function normalizeWallpaper(value: string | null | undefined): WallpaperId {
  if (value && WALLPAPER_SET.has(value)) return value as WallpaperId;
  return "aurora";
}

export function isAnimatedWallpaper(id: string): boolean {
  return WALLPAPER_GROUPS.some((g) => g.options.some((o) => o.id === id && o.animated));
}
