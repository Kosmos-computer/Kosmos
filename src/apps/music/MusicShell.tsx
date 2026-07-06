/**
 * Shell integration for music — persistent engine, floating widget, and window
 * lifecycle sync (minimize/close → widget; restore → full app).
 */
import { useEffect } from "react";
import { useWindowStore } from "../../os/windowStore";
import { MusicEngine } from "./MusicEngine";
import { MusicMiniWidget } from "./MusicMiniWidget";
import { useMusicStore } from "./musicStore";

const MUSIC_WINDOW_ID = "system:music";

export function MusicShell() {
  const windows = useWindowStore((s) => s.windows);
  const playing = useMusicStore((s) => s.playing);
  const activeTrackId = useMusicStore((s) => s.activeTrackId);
  const showWidget = useMusicStore((s) => s.showWidget);

  const musicWindow = windows.find((w) => w.id === MUSIC_WINDOW_ID);
  const musicOpen = Boolean(musicWindow);
  const musicMinimized = musicWindow?.minimized ?? false;
  const hasSession = Boolean(activeTrackId);

  useEffect(() => {
    if (!hasSession) return;
    if (musicMinimized || (!musicOpen && playing)) {
      showWidget();
    }
  }, [hasSession, musicMinimized, musicOpen, playing, showWidget]);

  return (
    <>
      <MusicEngine />
      <MusicMiniWidget />
    </>
  );
}
