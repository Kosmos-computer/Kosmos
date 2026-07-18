import { useEffect, useState } from "react";
import { Switch } from "../../components/ui";

const STORAGE_KEY = "arco.longformer.settings";

interface LongformerSettings {
  autoDetectLanguage: boolean;
  speakerDiarization: boolean;
  removeFillerWords: boolean;
  autoTranscribeUploads: boolean;
}

const DEFAULTS: LongformerSettings = {
  autoDetectLanguage: true,
  speakerDiarization: true,
  removeFillerWords: false,
  autoTranscribeUploads: true,
};

function loadSettings(): LongformerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<LongformerSettings>) };
  } catch {
    return DEFAULTS;
  }
}

/** Local Longformer preferences — persisted in the browser until a server settings API exists. */
export function LongformerSettingsView() {
  const [settings, setSettings] = useState<LongformerSettings>(() => loadSettings());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const toggle = (key: keyof LongformerSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="arco-longformer-library">
      <header className="arco-longformer-library__header">
        <div>
          <h1 className="arco-longformer-library__title">Settings</h1>
          <p className="arco-longformer-placeholder__text">
            Preferences for this device. Server-backed workspace settings are not wired yet.
          </p>
        </div>
      </header>

      <div className="arco-longformer-settings">
        {(
          [
            ["autoDetectLanguage", "Auto-detect language"],
            ["speakerDiarization", "Speaker diarization"],
            ["removeFillerWords", "Remove filler words"],
            ["autoTranscribeUploads", "Auto-transcribe uploads"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="arco-longformer-settings__row">
            <span>{label}</span>
            <Switch
              checked={settings[key]}
              onChange={() => toggle(key)}
              aria-label={label}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
