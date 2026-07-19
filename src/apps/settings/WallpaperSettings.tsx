import { useCallback, useRef, useState } from "react";
import { Folder, HardDrive, Plus, Trash2 } from "lucide-react";
import { SettingsFieldRow } from "../../components/patterns";
import { Menu } from "../../components/Menu";
import { useOsStore } from "../../os/osStore";
import { AUTH_WALLPAPER_GROUPS } from "../../os/wallpaper/authWallpapers";
import { WALLPAPER_GROUPS, getWallpaperImageUrl } from "../../os/wallpaper/wallpapers";
import { fileToWallpaperDataUrl } from "../../os/wallpaper/wallpaperImage";
import { WallpaperImageDrivePicker } from "./WallpaperImageDrivePicker";

/** Shared wallpaper controls used by both Appearance and the Wallpaper page. */
export function WallpaperSettings() {
  const wallpaper = useOsStore((state) => state.wallpaper);
  const setWallpaper = useOsStore((state) => state.setWallpaper);
  const customWallpaperImage = useOsStore((state) => state.customWallpaperImage);
  const setCustomWallpaperImage = useOsStore((state) => state.setCustomWallpaperImage);
  const authWallpaper = useOsStore((state) => state.authWallpaper);
  const setAuthWallpaper = useOsStore((state) => state.setAuthWallpaper);
  const notify = useOsStore((state) => state.notify);
  const desktopImageUrl = getWallpaperImageUrl(wallpaper, customWallpaperImage);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const importImage = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        const dataUrl = await fileToWallpaperDataUrl(file);
        setCustomWallpaperImage(dataUrl);
      } catch (err) {
        notify(err instanceof Error ? err.message : "Could not add wallpaper");
      } finally {
        setImporting(false);
      }
    },
    [notify, setCustomWallpaperImage],
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void importImage(file);
        }}
      />

      {WALLPAPER_GROUPS.map((group) => (
        <SettingsFieldRow key={group.label} label={group.label} layout="stack">
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

            {group.label === "Photos" ? (
              <>
                {customWallpaperImage ? (
                  <button
                    type="button"
                    className={`arco-wallpaper-swatch ${wallpaper === "custom" ? "arco-wallpaper-swatch--active" : ""}`}
                    onClick={() => setWallpaper("custom")}
                    aria-pressed={wallpaper === "custom"}
                    aria-label="Custom background"
                  >
                    <span
                      className="arco-wallpaper-swatch__preview arco-wallpaper-swatch__preview--photo"
                      style={{ backgroundImage: `url(${customWallpaperImage})` }}
                    />
                    <span className="arco-wallpaper-swatch__label">Custom</span>
                  </button>
                ) : null}

                <Menu
                  aria-label="Add wallpaper"
                  searchable={false}
                  portal
                  align="start"
                  items={[
                    {
                      id: "local",
                      label: "From this computer",
                      description: "Choose an image from disk",
                      icon: HardDrive,
                      disabled: importing,
                      onSelect: () => fileInputRef.current?.click(),
                    },
                    {
                      id: "drive",
                      label: "From Files",
                      description: "Choose an image already in Arco Files",
                      icon: Folder,
                      disabled: importing,
                      onSelect: () => setDrivePickerOpen(true),
                    },
                    ...(customWallpaperImage
                      ? [
                          {
                            id: "remove",
                            label: "Remove custom",
                            icon: Trash2,
                            danger: true,
                            separatorAbove: true,
                            onSelect: () => setCustomWallpaperImage(null),
                          },
                        ]
                      : []),
                  ]}
                  trigger={
                    <button
                      type="button"
                      className="arco-wallpaper-swatch arco-wallpaper-swatch--add"
                      aria-label="Add wallpaper from computer or Files"
                      disabled={importing}
                    >
                      <span className="arco-wallpaper-swatch__preview arco-wallpaper-swatch__preview--add">
                        <Plus size={20} strokeWidth={1.75} />
                      </span>
                      <span className="arco-wallpaper-swatch__label">
                        {importing ? "Adding…" : "Add"}
                      </span>
                    </button>
                  }
                />
              </>
            ) : null}
          </div>
        </SettingsFieldRow>
      ))}

      {AUTH_WALLPAPER_GROUPS.map((group) => (
        <SettingsFieldRow key={group.label} label={group.label} layout="stack">
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
                          ? `arco-wallpaper-${wallpaper === "custom" ? "space" : wallpaper}`
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

      <WallpaperImageDrivePicker
        open={drivePickerOpen}
        busy={importing}
        onClose={() => setDrivePickerOpen(false)}
        onPick={(file) => void importImage(file)}
      />
    </>
  );
}
