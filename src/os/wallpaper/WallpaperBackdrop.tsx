/**
 * Full-viewport wallpaper layer — static gradients via CSS classes, live
 * effects via child components. Mounted once per shell surface (desktop, auth).
 */
import { useOsStore } from "../osStore";
import { isAnimatedWallpaper } from "./wallpapers";
import { StarfieldWallpaper } from "./StarfieldWallpaper";
import { NebulaWallpaper } from "./NebulaWallpaper";

export function WallpaperBackdrop() {
  const wallpaper = useOsStore((s) => s.wallpaper);
  const theme = useOsStore((s) => s.theme);

  return (
    <div className={`arco-wallpaper arco-wallpaper-${wallpaper}`} aria-hidden>
      {wallpaper === "starfield" && <StarfieldWallpaper theme={theme} />}
      {wallpaper === "nebula" && <NebulaWallpaper theme={theme} />}
      {isAnimatedWallpaper(wallpaper) && <div className="arco-wallpaper__veil" />}
    </div>
  );
}
