/**
 * Wallpaper catalog — bundled photo presets, static gradients, and live
 * canvas/CSS effects. IDs persist in localStorage via osStore; unknown values
 * fall back to the space photo.
 */

export type WallpaperId =
  | "space"
  | "talisker-bay"
  | "northern-lights"
  | "desert-dunes"
  | "mountain-lake"
  | "custom"
  | "aurora"
  | "dusk"
  | "graphite"
  | "forest"
  | "starfield"
  | "nebula"
  | "overworld";

export interface WallpaperOption {
  id: WallpaperId;
  label: string;
  /** Bundled photo under /public/wallpapers — rendered as a cover image. */
  imageUrl?: string;
  /** When true, WallpaperBackdrop mounts a canvas or animated layer. */
  animated?: boolean;
}

export interface WallpaperGroup {
  label: string;
  options: WallpaperOption[];
}

/** Local copies of free Pexels photos (not hotlinked). */
export const WALLPAPER_GROUPS: WallpaperGroup[] = [
  {
    label: "Photos",
    options: [
      { id: "space", label: "Space", imageUrl: "/wallpapers/space.jpg" },
      { id: "talisker-bay", label: "Talisker Bay", imageUrl: "/wallpapers/talisker-bay.jpg" },
      { id: "northern-lights", label: "Northern lights", imageUrl: "/wallpapers/northern-lights.jpg" },
      { id: "desert-dunes", label: "Desert dunes", imageUrl: "/wallpapers/desert-dunes.jpg" },
      { id: "mountain-lake", label: "Mountain lake", imageUrl: "/wallpapers/mountain-lake.jpg" },
    ],
  },
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
      { id: "overworld", label: "Overworld (prototype)", animated: true },
    ],
  },
];

export const WALLPAPER_IDS = WALLPAPER_GROUPS.flatMap((g) => g.options.map((o) => o.id));

/** User-uploaded / Files-picked image — rendered via customWallpaperImage in osStore. */
const WALLPAPER_SET = new Set<string>([...WALLPAPER_IDS, "custom"]);

const WALLPAPER_BY_ID = new Map(
  WALLPAPER_GROUPS.flatMap((g) => g.options.map((o) => [o.id, o] as const)),
);

/** Coerce persisted/localStorage values to a known wallpaper id. */
export function normalizeWallpaper(value: string | null | undefined): WallpaperId {
  // Legacy auth/desktop id before the photo was renamed to "space".
  if (value === "galaxy") return "space";
  if (value && WALLPAPER_SET.has(value)) return value as WallpaperId;
  return "space";
}

export function getWallpaperOption(id: WallpaperId): WallpaperOption | undefined {
  return WALLPAPER_BY_ID.get(id);
}

export function getWallpaperImageUrl(
  id: WallpaperId,
  customImage?: string | null,
): string | undefined {
  if (id === "custom") return customImage ?? undefined;
  return WALLPAPER_BY_ID.get(id)?.imageUrl;
}

export function isPhotoWallpaper(id: string, customImage?: string | null): boolean {
  if (id === "custom") return Boolean(customImage);
  return Boolean(WALLPAPER_BY_ID.get(id as WallpaperId)?.imageUrl);
}

export function isAnimatedWallpaper(id: string): boolean {
  return WALLPAPER_GROUPS.some((g) => g.options.some((o) => o.id === id && o.animated));
}
