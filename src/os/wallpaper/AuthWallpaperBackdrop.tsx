/**
 * Sign-in layer backdrop — reads authWallpaper from osStore, which defaults to
 * the galaxy photo and can be changed independently of the desktop wallpaper.
 */
import { useOsStore } from "../osStore";
import { isAnimatedWallpaper } from "./wallpapers";
import { resolveAuthWallpaper } from "./authWallpapers";
import { StarfieldWallpaper } from "./StarfieldWallpaper";
import { NebulaWallpaper } from "./NebulaWallpaper";

export function AuthWallpaperBackdrop() {
  const authWallpaper = useOsStore((s) => s.authWallpaper);
  const desktopWallpaper = useOsStore((s) => s.wallpaper);
  const theme = useOsStore((s) => s.theme);
  const resolved = resolveAuthWallpaper(authWallpaper, desktopWallpaper);

  if (resolved.kind === "photo") {
    return (
      <div className="arco-wallpaper arco-auth-wallpaper arco-auth-wallpaper--photo" aria-hidden>
        <img className="arco-auth-wallpaper__photo" src={resolved.url} alt="" decoding="async" />
        <div className="arco-wallpaper__veil arco-auth-wallpaper__veil" />
      </div>
    );
  }

  const wallpaper = resolved.id;
  return (
    <div className={`arco-wallpaper arco-wallpaper-${wallpaper}`} aria-hidden>
      {wallpaper === "starfield" && <StarfieldWallpaper theme={theme} />}
      {wallpaper === "nebula" && <NebulaWallpaper theme={theme} />}
      {isAnimatedWallpaper(wallpaper) && <div className="arco-wallpaper__veil" />}
    </div>
  );
}
