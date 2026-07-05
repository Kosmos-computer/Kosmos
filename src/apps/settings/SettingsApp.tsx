/**
 * Settings — LLM provider (presets + custom + mock), theme, wallpaper.
 * API keys persist server-side and come back masked.
 */
import { useEffect, useState } from "react";
import type { LlmProvider, Settings } from "@shared/types";
import { PROVIDER_PRESETS } from "@shared/types";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import { useOsStore } from "../../os/osStore";
import { PasswordSection } from "./PasswordSection";
import { UsersSection } from "./UsersSection";
import { AppsSection } from "./AppsSection";
import { AgentSection } from "./AgentSection";
import { McpServersSection } from "./McpServersSection";
import { ProvidersSection } from "./ProvidersSection";

const PROVIDERS: { id: LlmProvider; label: string }[] = [
  { id: "mock", label: "Mock (no key needed)" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "ollama", label: "Ollama (local)" },
  { id: "local", label: "Arco Models (local)" },
  { id: "custom", label: "Custom endpoint" },
];

const WALLPAPERS = ["aurora", "dusk", "graphite", "forest"];

export function SettingsApp() {
  const { theme, setTheme, wallpaper, setWallpaper } = useOsStore();
  const canManageUsers = useCan("users:manage");
  const canWriteSettings = useCan("settings:write");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void api.getSettings().then(setSettings);
  }, []);

  if (!settings) return <div className="arco-empty">Loading settings…</div>;

  const update = (patch: Partial<Settings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s));
    setSaved(false);
  };

  const pickProvider = (provider: LlmProvider) => {
    if (provider === "mock" || provider === "custom") {
      update({ provider });
    } else {
      const preset = PROVIDER_PRESETS[provider];
      update({ provider, baseUrl: preset.baseUrl, model: preset.model });
    }
  };

  const save = async () => {
    const result = await api.saveSettings(settings);
    setSettings(result);
    setSaved(true);
  };

  return (
    <div className="arco-panel arco-scroll" style={{ gap: 16 }}>
      <section className="arco-form">
        <strong>Model provider</strong>
        <div className="arco-chip-row">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              className={`arco-chip ${settings.provider === p.id ? "arco-chip--active" : ""}`}
              onClick={() => pickProvider(p.id)}
              aria-pressed={settings.provider === p.id}
            >
              {p.label}
            </button>
          ))}
        </div>

        {settings.provider !== "mock" && (
          <>
            <label className="arco-label" htmlFor="set-baseurl">
              Base URL (OpenAI-compatible)
            </label>
            <input
              id="set-baseurl"
              className="arco-input"
              value={settings.baseUrl}
              onChange={(e) => update({ baseUrl: e.target.value })}
            />
            <label className="arco-label" htmlFor="set-model">
              Model
            </label>
            <input
              id="set-model"
              className="arco-input"
              value={settings.model}
              onChange={(e) => update({ model: e.target.value })}
            />
            <label className="arco-label" htmlFor="set-key">
              API key
            </label>
            <input
              id="set-key"
              className="arco-input"
              type="password"
              value={settings.apiKey}
              placeholder="sk-…"
              onChange={(e) => update({ apiKey: e.target.value })}
            />
          </>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="arco-btn arco-btn--primary" onClick={() => void save()}>
            Save
          </button>
          {saved && <span style={{ color: "var(--arco-success)", fontSize: "var(--arco-text-sm)" }}>Saved</span>}
        </div>
      </section>

      <section className="arco-form">
        <strong>Appearance</strong>
        <label className="arco-label">Theme</label>
        <div className="arco-chip-row">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              className={`arco-chip ${theme === t ? "arco-chip--active" : ""}`}
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="arco-label">Wallpaper</label>
        <div className="arco-chip-row">
          {WALLPAPERS.map((w) => (
            <button
              key={w}
              className={`arco-chip ${wallpaper === w ? "arco-chip--active" : ""}`}
              onClick={() => setWallpaper(w)}
              aria-pressed={wallpaper === w}
            >
              {w}
            </button>
          ))}
        </div>
      </section>

      <AppsSection />

      <McpServersSection />

      {canWriteSettings && <AgentSection />}

      <ProvidersSection />

      <PasswordSection />

      {canManageUsers && <UsersSection />}
    </div>
  );
}
