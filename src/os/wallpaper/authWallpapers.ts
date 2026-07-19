/**
 * Sign-in screen backgrounds — separate from the desktop wallpaper so the
 * auth layer can keep its own preference while still sharing the photo,
 * gradient, and live catalogs.
 */
import {
  WALLPAPER_GROUPS,
  getWallpaperImageUrl,
  normalizeWallpaper,
  type WallpaperId,
} from "./wallpapers";

export type AuthWallpaperId = "desktop" | WallpaperId;

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

const PHOTO_OPTIONS: AuthWallpaperOption[] = WALLPAPER_GROUPS.find(
  (g) => g.label === "Photos",
)!.options.map((o) => ({ id: o.id, label: o.label, imageUrl: o.imageUrl }));

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
      ...PHOTO_OPTIONS,
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

/** Coerce persisted values; unknown ids fall back to the space photo. */
export function normalizeAuthWallpaper(value: string | null | undefined): AuthWallpaperId {
  if (value === "galaxy") return "space";
  if (value && AUTH_WALLPAPER_SET.has(value)) return value as AuthWallpaperId;
  return "space";
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
  customDesktopImage?: string | null,
): ResolvedAuthWallpaper {
  if (authWallpaper === "desktop") {
    const desktopUrl = getWallpaperImageUrl(desktopWallpaper, customDesktopImage);
    if (desktopUrl) return { kind: "photo", url: desktopUrl };
    return { kind: "wallpaper", id: desktopWallpaper === "custom" ? "space" : desktopWallpaper };
  }

  const photoUrl = getWallpaperImageUrl(authWallpaper, customDesktopImage);
  if (photoUrl) return { kind: "photo", url: photoUrl };

  return { kind: "wallpaper", id: normalizeWallpaper(authWallpaper) };
}
