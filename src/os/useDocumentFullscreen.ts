import { useEffect, useState } from "react";

/** Tracks document fullscreen and toggles enter/exit via the Fullscreen API. */
export function useDocumentFullscreen() {
  const [fullscreen, setFullscreen] = useState(() => Boolean(document.fullscreenElement));

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggle() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Denied by the user or unsupported in this context.
    }
  }

  return { fullscreen, toggle };
}
