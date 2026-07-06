/**
 * Settings — LLM provider (presets + custom + mock), theme, wallpaper.
 * API keys persist server-side and come back masked.
 */
import { useEffect, useMemo, useState } from "react";
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
import { WALLPAPER_GROUPS, type WallpaperId } from "../../os/wallpaper/wallpapers";
import { AUTH_WALLPAPER_GROUPS, type AuthWallpaperId } from "../../os/wallpaper/authWallpapers";
import {
  SettingsChipRow,
  SettingsFieldRow,
  SettingsPage,
  SettingsSaveBar,
  SettingsSection,
  SettingsStack,
  SidebarPane,
} from "../../components/patterns";
import { Button, Chip, EmptyState, Input } from "../../components/ui";
import { SettingsNav } from "./SettingsNav";
import {
  DEFAULT_SETTINGS_SECTION,
  settingsSectionLabel,
  visibleSettingsNavGroups,
  type SettingsSectionId,
} from "./settingsSections";

const PROVIDERS: { id: LlmProvider; label: string }[] = [
  { id: "mock", label: "Mock (no key needed)" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "ollama", label: "Ollama (local)" },
  { id: "local", label: "Arco Models (local)" },
  { id: "custom", label: "Custom endpoint" },
];

export function SettingsApp() {
  const { theme, setTheme, wallpaper, setWallpaper, authWallpaper, setAuthWallpaper } = useOsStore();
  const canManageUsers = useCan("users:manage");
  const canWriteSettings = useCan("settings:write");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(DEFAULT_SETTINGS_SECTION);
  const [sidebarWidth, setSidebarWidth] = useState(220);

  const navGroups = useMemo(
    () => visibleSettingsNavGroups({ canWriteSettings, canManageUsers }),
    [canWriteSettings, canManageUsers],
  );

  useEffect(() => {
    void api.getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    const visible = navGroups.flatMap((group) => group.items.map((item) => item.id));
    if (!visible.includes(activeSection)) {
      setActiveSection(visible[0] ?? DEFAULT_SETTINGS_SECTION);
    }
  }, [navGroups, activeSection]);

  if (!settings) return <EmptyState>Loading settings…</EmptyState>;

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

  const sectionTitle = settingsSectionLabel(activeSection, navGroups);

  return (
    <div className="arco-settings-shell">
      <SidebarPane
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
        minWidth={200}
        maxWidth={320}
        handleLabel="Resize settings sidebar"
      >
        <SettingsNav groups={navGroups} activeSection={activeSection} onSelect={setActiveSection} />
      </SidebarPane>

      <div className="arco-settings-shell__main">
        <header className="arco-settings-shell__header">
          <h1 className="arco-settings-shell__title">{sectionTitle}</h1>
        </header>
        <div className="arco-settings-shell__content arco-scroll">
          {activeSection === "agent" && (
            <SettingsPage>
              <SettingsSection
                intro="Choose which agent runtime handles chat. External ACP agents bring their own model and tools."
              >
                <SettingsStack>
                  <SettingsFieldRow label="Runtime">
                    <SettingsChipRow>
                      {[{ id: "builtin", label: "Built-in" }, ...ACP_PRESETS, { id: "custom", label: "Custom (ACP)" }].map(
                        (a) => (
                          <Chip key={a.id} active={activeAgentChip === a.id} onClick={() => pickAgent(a.id)}>
                            {a.label}
                          </Chip>
                        ),
                      )}
                    </SettingsChipRow>
                  </SettingsFieldRow>
                  {settings.agent === "acp" && (
                    <SettingsFieldRow
                      label="Spawn command"
                      htmlFor="set-acp-command"
                      hint="stdio ACP server — sign in with the provider CLI or set a matching API key below"
                    >
                      <Input
                        id="set-acp-command"
                        width="auto"
                        value={settings.acpCommand}
                        placeholder="npx -y @zed-industries/claude-code-acp"
                        onChange={(e) => update({ acpCommand: e.target.value })}
                      />
                    </SettingsFieldRow>
                  )}
                </SettingsStack>
                <SettingsSaveBar saved={saved}>
                  <Button variant="primary" onClick={() => void save()}>
                    Save
                  </Button>
                </SettingsSaveBar>
              </SettingsSection>
            </SettingsPage>
          )}

          {activeSection === "model" && (
            <SettingsPage>
              <SettingsSection intro="Provider settings apply to the built-in agent and automations.">
                <SettingsStack>
                  <SettingsFieldRow label="Provider">
                    <SettingsChipRow>
                      {PROVIDERS.map((p) => (
                        <Chip
                          key={p.id}
                          active={settings.provider === p.id}
                          onClick={() => pickProvider(p.id)}
                        >
                          {p.label}
                        </Chip>
                      ))}
                    </SettingsChipRow>
                  </SettingsFieldRow>
                  {settings.provider !== "mock" && (
                    <>
                      <SettingsFieldRow label="Base URL" htmlFor="set-baseurl">
                        <Input
                          id="set-baseurl"
                          width="auto"
                          value={settings.baseUrl}
                          onChange={(e) => update({ baseUrl: e.target.value })}
                        />
                      </SettingsFieldRow>
                      <SettingsFieldRow label="Model" htmlFor="set-model">
                        <Input
                          id="set-model"
                          width="auto"
                          value={settings.model}
                          onChange={(e) => update({ model: e.target.value })}
                        />
                      </SettingsFieldRow>
                      <SettingsFieldRow label="API key" htmlFor="set-key">
                        <Input
                          id="set-key"
                          width="auto"
                          type="password"
                          value={settings.apiKey}
                          placeholder="sk-…"
                          onChange={(e) => update({ apiKey: e.target.value })}
                        />
                      </SettingsFieldRow>
                    </>
                  )}
                </SettingsStack>
                <SettingsSaveBar saved={saved}>
                  <Button variant="primary" onClick={() => void save()}>
                    Save
                  </Button>
                </SettingsSaveBar>
              </SettingsSection>
            </SettingsPage>
          )}

          {activeSection === "appearance" && (
            <SettingsPage>
              <SettingsSection intro="Theme and background for the desktop and sign-in screen.">
                <SettingsStack>
                  <SettingsFieldRow label="Theme">
                    <SettingsChipRow>
                      {(["dark", "light"] as const).map((t) => (
                        <Chip key={t} active={theme === t} onClick={() => setTheme(t)}>
                          {t}
                        </Chip>
                      ))}
                    </SettingsChipRow>
                  </SettingsFieldRow>
                  {WALLPAPER_GROUPS.map((group) => (
                    <SettingsFieldRow key={group.label} label={group.label} alignTop>
                      <div className="arco-wallpaper-grid">
                        {group.options.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`arco-wallpaper-swatch ${wallpaper === option.id ? "arco-wallpaper-swatch--active" : ""}`}
                            onClick={() => setWallpaper(option.id as WallpaperId)}
                            aria-pressed={wallpaper === option.id}
                            aria-label={`${option.label} background${option.animated ? " (animated)" : ""}`}
                          >
                            <span className={`arco-wallpaper-swatch__preview arco-wallpaper-${option.id}`} />
                            <span className="arco-wallpaper-swatch__label">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </SettingsFieldRow>
                  ))}
                  {AUTH_WALLPAPER_GROUPS.map((group) => (
                    <SettingsFieldRow key={group.label} label={group.label} alignTop>
                      <div className="arco-wallpaper-grid">
                        {group.options.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`arco-wallpaper-swatch ${authWallpaper === option.id ? "arco-wallpaper-swatch--active" : ""}`}
                            onClick={() => setAuthWallpaper(option.id as AuthWallpaperId)}
                            aria-pressed={authWallpaper === option.id}
                            aria-label={`${option.label} sign-in background${option.animated ? " (animated)" : ""}`}
                          >
                            <span
                              className={`arco-wallpaper-swatch__preview ${
                                option.imageUrl
                                  ? "arco-auth-wallpaper-swatch__preview--photo"
                                  : option.id === "desktop"
                                    ? `arco-wallpaper-${wallpaper}`
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
                </SettingsStack>
              </SettingsSection>
            </SettingsPage>
          )}

          {activeSection === "apps" && <AppsSection />}
          {activeSection === "tools" && <ToolsSection />}
          {activeSection === "mcp" && <McpServersSection />}
          {activeSection === "skills" && <SkillsSection />}
          {activeSection === "channels" && <ChannelsSection />}
          {activeSection === "permissions" && canWriteSettings && <AgentSection />}
          {activeSection === "providers" && <ProvidersSection />}
          {activeSection === "external" && <ExternalAccessSection />}
          {activeSection === "password" && <PasswordSection />}
          {activeSection === "users" && canManageUsers && <UsersSection />}
        </div>
      </div>
    </div>
  );
}
