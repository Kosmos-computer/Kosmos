/**
 * Full-viewport wallpaper layer — bundled photos, static gradients via CSS
 * classes, and live effects via child components. Mounted once per shell
 * surface (desktop, auth).
 */
import { useOsStore } from "../osStore";
import { getWallpaperImageUrl, isAnimatedWallpaper } from "./wallpapers";
import { StarfieldWallpaper } from "./StarfieldWallpaper";
import { NebulaWallpaper } from "./NebulaWallpaper";

export function WallpaperBackdrop() {
  const wallpaper = useOsStore((s) => s.wallpaper);
  const theme = useOsStore((s) => s.theme);
  const imageUrl = getWallpaperImageUrl(wallpaper);

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
      {isAnimatedWallpaper(wallpaper) && <div className="arco-wallpaper__veil" />}
    </div>
  );
}
