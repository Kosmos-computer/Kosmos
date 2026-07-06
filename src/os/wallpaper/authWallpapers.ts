/**
 * Sign-in screen backgrounds — separate from the desktop wallpaper so the
 * auth layer can default to a photo while the shell keeps gradient presets.
 */
import {
  WALLPAPER_GROUPS,
  normalizeWallpaper,
  type WallpaperId,
} from "./wallpapers";

/** Pexels: galaxy-of-many-shiny-stars-in-dark-sky-4719340 */
export const GALAXY_WALLPAPER_URL =
  "https://images.pexels.com/photos/4719340/pexels-photo-4719340.jpeg?auto=compress&cs=tinysrgb&w=1920";

export type AuthWallpaperId =
  | "galaxy"
  | "desktop"
  | WallpaperId;

export interface AuthWallpaperOption {
  id: AuthWallpaperId;
  label: string;
  /** Photo swatches and the sign-in backdrop when this option is selected. */
  imageUrl?: string;
  animated?: boolean;
}

export interface AuthWallpaperGroup {
  label: string;
  options: AuthWallpaperOption[];
}

const GRADIENT_OPTIONS: AuthWallpaperOption[] = WALLPAPER_GROUPS.find(
  (g) => g.label === "Gradients",
)!.options.map((o) => ({ id: o.id, label: o.label }));

const LIVE_OPTIONS: AuthWallpaperOption[] = WALLPAPER_GROUPS.find(
  (g) => g.label === "Live effects",
)!.options.map((o) => ({ id: o.id, label: o.label, animated: o.animated }));

export const AUTH_WALLPAPER_GROUPS: AuthWallpaperGroup[] = [
  {
    label: "Sign-in screen",
    options: [
      { id: "galaxy", label: "Galaxy", imageUrl: GALAXY_WALLPAPER_URL },
      { id: "desktop", label: "Match desktop" },
      ...GRADIENT_OPTIONS,
      ...LIVE_OPTIONS,
    ],
  },
];

export const AUTH_WALLPAPER_IDS = AUTH_WALLPAPER_GROUPS.flatMap((g) =>
  g.options.map((o) => o.id),
);

const AUTH_WALLPAPER_SET = new Set<string>(AUTH_WALLPAPER_IDS);

/** Coerce persisted values; unknown ids fall back to the galaxy photo. */
export function normalizeAuthWallpaper(value: string | null | undefined): AuthWallpaperId {
  if (value && AUTH_WALLPAPER_SET.has(value)) return value as AuthWallpaperId;
  return "galaxy";
}

export function getAuthWallpaperOption(id: AuthWallpaperId): AuthWallpaperOption | undefined {
  for (const group of AUTH_WALLPAPER_GROUPS) {
    const match = group.options.find((o) => o.id === id);
    if (match) return match;
  }
  return undefined;
}

export type ResolvedAuthWallpaper =
  | { kind: "photo"; url: string }
  | { kind: "wallpaper"; id: WallpaperId };

/** Map the sign-in preference to either a photo URL or a desktop-style wallpaper id. */
export function resolveAuthWallpaper(
  authWallpaper: AuthWallpaperId,
  desktopWallpaper: WallpaperId,
): ResolvedAuthWallpaper {
  if (authWallpaper === "galaxy") {
    return { kind: "photo", url: GALAXY_WALLPAPER_URL };
  }
  if (authWallpaper === "desktop") {
    return { kind: "wallpaper", id: desktopWallpaper };
  }
  return { kind: "wallpaper", id: normalizeWallpaper(authWallpaper) };
}
