import { I18nKey } from "../i18n/declaration";
import i18n from "../i18n/index";
import { useRef, useState } from "react";
import { Volume1, Volume2, VolumeX } from "lucide-react";
import { useDismiss } from "../components/useDismiss";
import { useSystemVolumeStore } from "./systemVolumeStore";

function volumeIcon(volume: number, muted: boolean) {
  if (muted || volume === 0) return VolumeX;
  if (volume < 40) return Volume1;
  return Volume2;
}

export function MenuBarVolumeControl() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const volume = useSystemVolumeStore((s) => s.volume);
  const muted = useSystemVolumeStore((s) => s.muted);
  const setVolume = useSystemVolumeStore((s) => s.setVolume);
  const setMuted = useSystemVolumeStore((s) => s.setMuted);

  useDismiss(open, () => setOpen(false), rootRef);

  const Icon = volumeIcon(volume, muted);
  const effectiveVolume = muted ? 0 : volume;

  return (
    <div className="arco-menu arco-menubar__volume" ref={rootRef}>
      <button
        type="button"
        className="arco-menubar__icon-btn"
        aria-label={`System volume: ${effectiveVolume}%`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={i18n.t(I18nKey.APPS$LONGFORMER_VOLUME)}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon size={14} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={i18n.t(I18nKey.OS_MENUBARVOLUMECONTROL_SYSTEM_VOLUME)}
          className="arco-menu__panel arco-menu__panel--bottom arco-menu__panel--end arco-menubar__volume-panel"
        >
          <label className="arco-menubar__volume-label" htmlFor="arco-menubar-volume">
            {i18n.t(I18nKey.OS$VOLUME_LABEL)}
          </label>
          <div className="arco-menubar__volume-row">
            <button
              type="button"
              className="arco-menubar__icon-btn"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted(!muted)}
            >
              <VolumeX size={14} />
            </button>
            <input
              id="arco-menubar-volume"
              type="range"
              className="arco-menubar__volume-slider"
              min={0}
              max={100}
              step={1}
              value={effectiveVolume}
              onChange={(event) => {
                const next = Number(event.target.value);
                setVolume(next);
                if (next > 0) setMuted(false);
              }}
            />
            <span className="arco-menubar__volume-value" aria-hidden="true">
              {effectiveVolume}%
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
