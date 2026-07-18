import { SettingsFieldRow } from "../../components/patterns";
import { useOsStore } from "../../os/osStore";
import { AUTH_WALLPAPER_GROUPS } from "../../os/wallpaper/authWallpapers";
import { WALLPAPER_GROUPS, getWallpaperImageUrl } from "../../os/wallpaper/wallpapers";

/** Shared wallpaper controls used by both Appearance and the Wallpaper page. */
export function WallpaperSettings() {
  const wallpaper = useOsStore((state) => state.wallpaper);
  const setWallpaper = useOsStore((state) => state.setWallpaper);
  const authWallpaper = useOsStore((state) => state.authWallpaper);
  const setAuthWallpaper = useOsStore((state) => state.setAuthWallpaper);
  const desktopImageUrl = getWallpaperImageUrl(wallpaper);

  return (
    <>
      {WALLPAPER_GROUPS.map((group) => (
        <SettingsFieldRow key={group.label} label={group.label} alignTop>
          <div className="arco-wallpaper-grid">
            {group.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`arco-wallpaper-swatch ${wallpaper === option.id ? "arco-wallpaper-swatch--active" : ""}`}
                onClick={() => setWallpaper(option.id)}
                aria-pressed={wallpaper === option.id}
                aria-label={`${option.label} background${option.animated ? " (animated)" : ""}`}
              >
                <span
                  className={`arco-wallpaper-swatch__preview ${
                    option.imageUrl
                      ? "arco-wallpaper-swatch__preview--photo"
                      : `arco-wallpaper-${option.id}`
                  }`}
                  style={option.imageUrl ? { backgroundImage: `url(${option.imageUrl})` } : undefined}
                />
                <span className="arco-wallpaper-swatch__label">{option.label}</span>
              </button>
            ))}
          </div>
        </SettingsFieldRow>
      ))}
      {AUTH_WALLPAPER_GROUPS.map((group) => (
        <SettingsFieldRow key={group.label} label={group.label} alignTop>
          <div className="arco-wallpaper-grid">
            {group.options.map((option) => {
              const matchDesktopPhoto = option.id === "desktop" ? desktopImageUrl : undefined;
              const previewUrl = option.imageUrl ?? matchDesktopPhoto;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`arco-wallpaper-swatch ${authWallpaper === option.id ? "arco-wallpaper-swatch--active" : ""}`}
                  onClick={() => setAuthWallpaper(option.id)}
                  aria-pressed={authWallpaper === option.id}
                  aria-label={`${option.label} sign-in background${option.animated ? " (animated)" : ""}`}
                >
                  <span
                    className={`arco-wallpaper-swatch__preview ${
                      previewUrl
                        ? "arco-wallpaper-swatch__preview--photo"
                        : option.id === "desktop"
                          ? `arco-wallpaper-${wallpaper}`
                          : `arco-wallpaper-${option.id}`
                    }`}
                    style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined}
                  />
                  <span className="arco-wallpaper-swatch__label">{option.label}</span>
                </button>
              );
            })}
          </div>
        </SettingsFieldRow>
      ))}
    </>
  );
}
