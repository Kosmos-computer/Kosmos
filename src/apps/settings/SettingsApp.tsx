/**
 * Settings — LLM provider (presets + custom + mock), theme, wallpaper.
 * API keys persist server-side and come back masked.
 */
import { useEffect, useState } from "react";
import type { LlmProvider, Settings } from "@shared/types";
import { ACP_PRESETS, PROVIDER_PRESETS } from "@shared/types";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import { useOsStore } from "../../os/osStore";
import { PasswordSection } from "./PasswordSection";
import { UsersSection } from "./UsersSection";
import { AppsSection } from "./AppsSection";
import { AgentSection } from "./AgentSection";
import { ChannelsSection } from "./ChannelsSection";
import { ExternalAccessSection } from "./ExternalAccessSection";
import { McpServersSection } from "./McpServersSection";
import { ProvidersSection } from "./ProvidersSection";
import { SkillsSection } from "./SkillsSection";
import { ToolsSection } from "./ToolsSection";

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

  // Which agent chip is lit: builtin, a matching preset, or custom.
  const activeAgentChip =
    settings.agent !== "acp"
      ? "builtin"
      : (ACP_PRESETS.find((p) => p.command === settings.acpCommand)?.id ?? "custom");

  const pickAgent = (chip: string) => {
    if (chip === "builtin") {
      update({ agent: "builtin" });
    } else if (chip === "custom") {
      update({ agent: "acp" });
    } else {
      const preset = ACP_PRESETS.find((p) => p.id === chip);
      update({ agent: "acp", acpCommand: preset?.command ?? settings.acpCommand });
    }
  };

  return (
    <div className="arco-panel arco-scroll" style={{ gap: 16 }}>
      <section className="arco-form">
        <strong>Agent</strong>
        <div className="arco-chip-row">
          {[{ id: "builtin", label: "Built-in" }, ...ACP_PRESETS, { id: "custom", label: "Custom (ACP)" }].map(
            (a) => (
              <button
                key={a.id}
                className={`arco-chip ${activeAgentChip === a.id ? "arco-chip--active" : ""}`}
                onClick={() => pickAgent(a.id)}
                aria-pressed={activeAgentChip === a.id}
              >
                {a.label}
              </button>
            ),
          )}
        </div>
        {settings.agent === "acp" && (
          <>
            <label className="arco-label" htmlFor="set-acp-command">
              Spawn command (stdio ACP server)
            </label>
            <input
              id="set-acp-command"
              className="arco-input"
              value={settings.acpCommand}
              placeholder="npx -y @zed-industries/claude-code-acp"
              onChange={(e) => update({ acpCommand: e.target.value })}
            />
            <p style={{ color: "var(--arco-text-dim)", fontSize: "var(--arco-text-sm)", margin: 0 }}>
              The external agent brings its own model and tools; the provider settings below only apply
              to the built-in agent (and automations, which always use it). Sign in with the provider's
              own CLI, or set a matching API key below. Enabled MCP servers are forwarded automatically.
            </p>
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

      <ToolsSection />

      <McpServersSection />

      <SkillsSection />

      <ChannelsSection />

      {canWriteSettings && <AgentSection />}

      <ProvidersSection />

      <ExternalAccessSection />

      <PasswordSection />

      {canManageUsers && <UsersSection />}
    </div>
  );
}
