/**
 * Full-viewport wallpaper layer — bundled photos, static gradients via CSS
 * classes, and live effects via child components. Mounted once per shell
 * surface (desktop, auth). Overworld (R3F) is lazy so Three.js stays out of
 * the default wallpaper path.
 */
import { lazy, Suspense } from "react";
import { useOsStore } from "../osStore";
import { getWallpaperImageUrl, isAnimatedWallpaper } from "./wallpapers";
import { StarfieldWallpaper } from "./StarfieldWallpaper";
import { NebulaWallpaper } from "./NebulaWallpaper";

const GameWorldWallpaper = lazy(() => import("./GameWorldWallpaper"));

export function WallpaperBackdrop() {
  const wallpaper = useOsStore((s) => s.wallpaper);
  const customWallpaperImage = useOsStore((s) => s.customWallpaperImage);
  const theme = useOsStore((s) => s.theme);
  const imageUrl = getWallpaperImageUrl(wallpaper, customWallpaperImage);

  if (imageUrl) {
    return (
      <div className="arco-wallpaper arco-wallpaper--photo" aria-hidden>
        <img className="arco-wallpaper__photo" src={imageUrl} alt="" decoding="async" />
      </div>
    );
  }

  return (
    <div className={`arco-wallpaper arco-wallpaper-${wallpaper}`} aria-hidden>
      {wallpaper === "starfield" && <StarfieldWallpaper theme={theme} />}
      {wallpaper === "nebula" && <NebulaWallpaper theme={theme} />}
      {wallpaper === "overworld" && (
        <Suspense fallback={null}>
          <GameWorldWallpaper theme={theme} />
        </Suspense>
      )}
      {isAnimatedWallpaper(wallpaper) && <div className="arco-wallpaper__veil" />}
    </div>
  );
}
