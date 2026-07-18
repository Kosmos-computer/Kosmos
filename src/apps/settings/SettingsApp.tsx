import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Settings — LLM provider (presets + custom + mock), theme, wallpaper.
 * API keys persist server-side and come back masked.
 */
import { useEffect, useMemo, useState } from "react";
import type { LlmProvider, Settings } from "@shared/types";
import { ACP_PRESETS, PROVIDER_PRESETS } from "@shared/types";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import { useOsStore, type AppWindowHost } from "../../os/osStore";
import {
  ACCENT_PRESET_OPTIONS,
  FONT_PRESET_OPTIONS,
  RADIUS_PRESET_OPTIONS,
  SPACING_PRESET_OPTIONS,
  TEXT_SCALE_PRESET_OPTIONS,
  WINDOW_CONTROL_ALIGN_OPTIONS,
  WINDOW_CONTROL_STYLE_OPTIONS,
} from "../../os/themeTokens";
import { isArcoDesktop } from "../../lib/desktopBridge";
import { ServerProfilesSection } from "./ServerProfilesSection";
import { mobileShellNeedsServerProfile } from "../../os/server/mobileShellMode";
import { PasswordSection } from "./PasswordSection";
import { UsersSection } from "./UsersSection";
import { AppsSection } from "./AppsSection";
import { AgentSection } from "./AgentSection";
import { CursorConnectionFields } from "./CursorConnectionFields";
import { AgentBackendsFields } from "./AgentBackendsFields";
import { OpenRouterModelPicker } from "./OpenRouterModelPicker";
import { ChannelsSection } from "./ChannelsSection";
import { ConnectedAccountsSection } from "./ConnectedAccountsSection";
import { ExternalAccessSection } from "./ExternalAccessSection";
import { McpServersSection } from "./McpServersSection";
import { ProvidersSection } from "./ProvidersSection";
import { SkillsSection } from "./SkillsSection";
import { MemorySection } from "./MemorySection";
import { UsageSection } from "./UsageSection";
import { BillingSection } from "./BillingSection";
import { DoctorRepairSection } from "./DoctorRepairSection";
import { KosmosCloudSection } from "./KosmosCloudSection";
import { PlatformDownloadsSection } from "./PlatformDownloadsSection";
import { DesktopUpdatesSection } from "./DesktopUpdatesSection";
import { ToolsSection } from "./ToolsSection";
import { WallpaperSettings } from "./WallpaperSettings";
import { FACE_BG_OPTIONS, FACE_RIG_OPTIONS, isCustomFaceBg, useFacePreferencesStore } from "../../face-rig";
import { FacePreviewWidget } from "./FacePreviewWidget";
import {
  SettingsChipRow,
  SettingsFieldRow,
  SettingsPage,
  SettingsRow,
  SettingsRowActions,
  SettingsRowMeta,
  SettingsSaveBar,
  SettingsSection,
  SettingsStack,
  SidebarPane,
} from "../../components/patterns";
import { useWindowStore } from "../../os/windowStore";
import { Button, Chip, EmptyState, Input, Switch } from "../../components/ui";
import { SettingsNav } from "./SettingsNav";
import { NavBrandMark } from "../../os/NavBrandMark";
import {
  DEFAULT_SETTINGS_SECTION,
  isStubSettingsSection,
  settingsSectionLabel,
  visibleSettingsNavGroups,
} from "./settingsSections";
import { navigateSettingsSection } from "../../os/shellNavigation";
import { useSettingsStore } from "./settingsStore";
import { ACCOUNT_STUB_SECTION_IDS } from "./settingsStubMock";
import { SettingsStubPane } from "./SettingsStubSection";
import { useSettingsStub } from "./useSettingsStub";
import { applyArcoLocale, AvailableLanguages, DEFAULT_LOCALE } from "../../i18n";
import { I18nKey } from "../../i18n/declaration";

const PROVIDERS: { id: LlmProvider; label: string }[] = [
  { id: "mock", label: "Mock (no key needed)" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "ollama", label: "Ollama (local)" },
  { id: "local", label: "Arco Models (local)" },
  { id: "custom", label: "Custom endpoint" },
];

const NAV_BRAND_MAX_BYTES = 512 * 1024;

export function SettingsApp() {
  const {
    theme,
    setTheme,
    accentPreset,
    setAccentPreset,
    radiusPreset,
    setRadiusPreset,
    fontPreset,
    setFontPreset,
    textScalePreset,
    setTextScalePreset,
    spacingPreset,
    setSpacingPreset,
    windowControlStyle,
    setWindowControlStyle,
    windowControlAlign,
    setWindowControlAlign,
    windowsOffscreen,
    setWindowsOffscreen,
    navBrandImage,
    setNavBrandImage,
    appWindowHost,
    setAppWindowHost,
    notify,
  } = useOsStore();
  const constrainWindowsToViewport = useWindowStore((s) => s.constrainToViewport);
  const faceBg = useFacePreferencesStore((s) => s.faceBg);
  const setFaceBg = useFacePreferencesStore((s) => s.setFaceBg);
  const faceRigId = useFacePreferencesStore((s) => s.faceRigId);
  const setFaceRigId = useFacePreferencesStore((s) => s.setFaceRigId);
  const canManageUsers = useCan("users:manage");
  const canWriteSettings = useCan("settings:write");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const activeSection = useSettingsStore((s) => s.activeSection);
  const setActiveSection = useSettingsStore((s) => s.setActiveSection);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [navSearch, setNavSearch] = useState("");
  const settingsStub = useSettingsStub();

  const navGroups = useMemo(
    () => visibleSettingsNavGroups({ canWriteSettings, canManageUsers }),
    [canWriteSettings, canManageUsers, i18n.language],
  );

  const refreshSettings = async () => {
    try {
      setLoadError(null);
      setSettings(await api.getSettings());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load settings");
    }
  };

  useEffect(() => {
    void refreshSettings();
  }, []);

  useEffect(() => {
    const visible = navGroups.flatMap((group) => group.items.map((item) => item.id));
    if (!visible.includes(activeSection)) {
      setActiveSection(visible[0] ?? DEFAULT_SETTINGS_SECTION);
    }
  }, [navGroups, activeSection]);

  if (loadError) {
    return (
      <EmptyState title={i18n.t(I18nKey.APPS$SETTINGS_COULD_NOT_LOAD_SETTINGS)}>
        {loadError}
        <Button variant="primary" onClick={() => void refreshSettings()}><T k={I18nKey.COMMON$RETRY} /></Button>
      </EmptyState>
    );
  }

  if (!settings) return <EmptyState><T k={I18nKey.APPS$SETTINGS_LOADING_SETTINGS} /></EmptyState>;

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
    await applyArcoLocale(result.locale ?? DEFAULT_LOCALE);
    useSettingsStore.getState().bumpSettingsRevision();
  };

  const activeAgentChip =
    settings.agent === "cursor"
      ? "cursor"
      : settings.agent === "openhands"
        ? "openhands"
        : settings.agent === "kosmos"
          ? "kosmos"
          : settings.agent !== "acp"
            ? "builtin"
            : (ACP_PRESETS.find((p) => p.command === settings.acpCommand)?.id ?? "custom");

  const pickAgent = (chip: string) => {
    if (chip === "builtin") {
      update({ agent: "builtin" });
    } else if (chip === "cursor") {
      update({ agent: "cursor" });
    } else if (chip === "openhands") {
      update({ agent: "openhands" });
    } else if (chip === "kosmos") {
      update({ agent: "kosmos" });
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
        handleLabel={i18n.t(I18nKey.APPS$SETTINGS_RESIZE_SETTINGS_SIDEBAR)}
      >
        <SettingsNav
          groups={navGroups}
          activeSection={activeSection}
          onSelect={navigateSettingsSection}
          searchQuery={navSearch}
          onSearchChange={setNavSearch}
        />
      </SidebarPane>

      <div className="arco-settings-shell__main">
        <header className="arco-settings-shell__header">
          <h1 className="arco-settings-shell__title">{sectionTitle}</h1>
        </header>
        <div className="arco-settings-shell__content arco-scroll">
          {isStubSettingsSection(activeSection) ? (
            <SettingsStubPane
              sectionIds={
                (ACCOUNT_STUB_SECTION_IDS as readonly string[]).includes(activeSection)
                  ? [...ACCOUNT_STUB_SECTION_IDS]
                  : [activeSection]
              }
              stub={settingsStub}
              showNotice={activeSection !== "wallpaper"}
            />
          ) : null}
          {activeSection === "advanced" ? <DoctorRepairSection /> : null}

          {activeSection === "agent" && (
            <SettingsPage>
              <SettingsSection
                intro={i18n.t(I18nKey.APPS$SETTINGS_CHOOSE_WHICH_AGENT_RUNTIME_HANDLES_CHAT_CURSOR_USES_THE_)}
              >
                <SettingsStack>
                  <SettingsFieldRow label={i18n.t(I18nKey.APPS$SETTINGS_RUNTIME)}>
                    <SettingsChipRow>
                      {[
                        { id: "builtin", label: "Built-in" },
                        { id: "cursor", label: "Cursor" },
                        { id: "openhands", label: "OpenHands" },
                        { id: "kosmos", label: "Kosmos" },
                        ...ACP_PRESETS,
                        { id: "custom", label: "Custom (ACP)" },
                      ].map((a) => (
                        <Chip key={a.id} active={activeAgentChip === a.id} onClick={() => pickAgent(a.id)}>
                          {a.label}
                        </Chip>
                      ))}
                    </SettingsChipRow>
                  </SettingsFieldRow>
                  {settings.agent === "cursor" ? (
                    <CursorConnectionFields settings={settings} update={update} />
                  ) : null}
                  {settings.agent === "openhands" ? (
                    <AgentBackendsFields kind="openhands" settings={settings} update={update} />
                  ) : null}
                  {settings.agent === "kosmos" ? (
                    <AgentBackendsFields kind="kosmos" settings={settings} update={update} />
                  ) : null}
                  {settings.agent === "acp" && (
                    <SettingsFieldRow
                      label={i18n.t(I18nKey.APPS$SETTINGS_SPAWN_COMMAND)}
                      htmlFor="set-acp-command"
                      hint="stdio ACP server — sign in with the provider CLI or set a matching API key below"
                    >
                      <Input
                        id="set-acp-command"
                        width="auto"
                        value={settings.acpCommand}
                        placeholder={i18n.t(I18nKey.APPS$SETTINGS_NPX_Y_ZED_INDUSTRIES_CLAUDE_CODE_ACP)}
                        onChange={(e) => update({ acpCommand: e.target.value })}
                      />
                    </SettingsFieldRow>
                  )}
                </SettingsStack>
                <SettingsSaveBar saved={saved}>
                  <Button variant="primary" onClick={() => void save()}><T k={I18nKey.COMMON$SAVE} /></Button>
                </SettingsSaveBar>
              </SettingsSection>
            </SettingsPage>
          )}

          {activeSection === "model" && (
            <SettingsPage>
              <SettingsSection intro={i18n.t(I18nKey.APPS$SETTINGS_PROVIDER_SETTINGS_APPLY_TO_THE_BUILT_IN_AGENT_AND_AUTOMA)}>
                <SettingsStack>
                  <SettingsRow>
                    <SettingsRowMeta><T k={I18nKey.APPS$SETTINGS_ASSIGN_MODELS_PER_USE_CASE_DOWNLOAD_LOCAL_MODELS_AND_ADD} /></SettingsRowMeta>
                    <SettingsRowActions>
                      <Button
                        onClick={() =>
                          useWindowStore.getState().open({ type: "system", app: "models" }, "Models")
                        }
                      ><T k={I18nKey.APPS$SETTINGS_OPEN_MODELS} /></Button>
                    </SettingsRowActions>
                  </SettingsRow>
                  <SettingsFieldRow label={i18n.t(I18nKey.COMPONENTS$PATTERNS_PROVIDER)}>
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
                      <SettingsFieldRow label={i18n.t(I18nKey.APPS$MODELS_BASE_URL)} htmlFor="set-baseurl">
                        <Input
                          id="set-baseurl"
                          width="auto"
                          value={settings.baseUrl}
                          onChange={(e) => update({ baseUrl: e.target.value })}
                        />
                      </SettingsFieldRow>
                      <SettingsFieldRow
                        label={i18n.t(I18nKey.APPS$SETTINGS_MODEL)}
                        htmlFor={settings.provider === "openrouter" ? "set-openrouter-model" : "set-model"}
                        hint={
                          settings.provider === "openrouter"
                            ? "Loaded from OpenRouter's catalog — search by name or id."
                            : undefined
                        }
                      >
                        {settings.provider === "openrouter" ? (
                          <OpenRouterModelPicker
                            model={settings.model}
                            apiKey={settings.apiKey}
                            onModelChange={(model) => update({ model })}
                          />
                        ) : (
                          <Input
                            id="set-model"
                            width="auto"
                            value={settings.model}
                            onChange={(e) => update({ model: e.target.value })}
                          />
                        )}
                      </SettingsFieldRow>
                      <SettingsFieldRow label={i18n.t(I18nKey.APPS$STARTUP_API_KEY)} htmlFor="set-key">
                        <Input
                          id="set-key"
                          width="auto"
                          type="password"
                          value={settings.apiKey}
                          placeholder={i18n.t(I18nKey.INSTALL$API_KEY_PLACEHOLDER)}
                          onChange={(e) => update({ apiKey: e.target.value })}
                        />
                      </SettingsFieldRow>
                    </>
                  )}
                </SettingsStack>
                <SettingsSaveBar saved={saved}>
                  <Button variant="primary" onClick={() => void save()}><T k={I18nKey.COMMON$SAVE} /></Button>
                </SettingsSaveBar>
              </SettingsSection>
            </SettingsPage>
          )}

          {activeSection === "appearance" && (
            <SettingsPage>
              <SettingsSection intro={i18n.t(I18nKey.APPS$SETTINGS_THEME_TYPOGRAPHY_SPACING_ASSISTANT_FACE_AND_BACKGROUND_F)}>
                <SettingsStack>
                  <SettingsFieldRow label={i18n.t(I18nKey.SETTINGS$LANGUAGE)} hint={i18n.t(I18nKey.SETTINGS$LANGUAGE_HINT)}>
                    <SettingsChipRow>
                      {AvailableLanguages.map((lang) => (
                        <Chip
                          key={lang.value}
                          active={(settings.locale ?? DEFAULT_LOCALE) === lang.value}
                          onClick={() => {
                            update({ locale: lang.value });
                            void applyArcoLocale(lang.value);
                          }}
                        >
                          {lang.label}
                        </Chip>
                      ))}
                    </SettingsChipRow>
                  </SettingsFieldRow>
                  <SettingsFieldRow label={i18n.t(I18nKey.OS_BENTO_THEME)}>
                    <SettingsChipRow>
                      {(["dark", "light"] as const).map((t) => (
                        <Chip key={t} active={theme === t} onClick={() => setTheme(t)}>
                          {t}
                        </Chip>
                      ))}
                    </SettingsChipRow>
                  </SettingsFieldRow>
                  <SettingsFieldRow
                    label={i18n.t(I18nKey.APPS$SETTINGS_UI_FONT)}
                    hint="Typeface for labels, menus, and body text across the shell."
                    alignTop
                  >
                    <div className="arco-font-preset-grid">
                      {FONT_PRESET_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`arco-font-preset-swatch ${fontPreset === option.id ? "arco-font-preset-swatch--active" : ""}`}
                          onClick={() => setFontPreset(option.id)}
                          aria-pressed={fontPreset === option.id}
                          aria-label={`${option.label} font`}
                        >
                          <span
                            className="arco-font-preset-swatch__preview"
                            style={{ fontFamily: option.family }}
                          ><T k={I18nKey.APPS$SETTINGS_AA} /></span>
                          <span className="arco-font-preset-swatch__label">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </SettingsFieldRow>
                  <SettingsFieldRow
                    label={i18n.t(I18nKey.APPS$SETTINGS_TEXT_SIZE)}
                    hint="Scale for labels, body copy, and headings."
                  >
                    <SettingsChipRow>
                      {TEXT_SCALE_PRESET_OPTIONS.map((option) => (
                        <Chip
                          key={option.id}
                          active={textScalePreset === option.id}
                          onClick={() => setTextScalePreset(option.id)}
                        >
                          {option.label}
                        </Chip>
                      ))}
                    </SettingsChipRow>
                  </SettingsFieldRow>
                  <SettingsFieldRow
                    label={i18n.t(I18nKey.APPS$SETTINGS_PADDING_SPACING)}
                    hint="Gaps and padding in panels, lists, and controls."
                  >
                    <SettingsChipRow>
                      {SPACING_PRESET_OPTIONS.map((option) => (
                        <Chip
                          key={option.id}
                          active={spacingPreset === option.id}
                          onClick={() => setSpacingPreset(option.id)}
                        >
                          {option.label}
                        </Chip>
                      ))}
                    </SettingsChipRow>
                  </SettingsFieldRow>
                  <SettingsFieldRow
                    label={i18n.t(I18nKey.APPS$SETTINGS_ACCENT_COLOR)}
                    hint="Buttons, links, and other accent-colored controls across the shell."
                    alignTop
                  >
                    <div className="arco-accent-preset-grid">
                      {ACCENT_PRESET_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`arco-accent-preset-swatch ${accentPreset === option.id ? "arco-accent-preset-swatch--active" : ""}`}
                          onClick={() => setAccentPreset(option.id)}
                          aria-pressed={accentPreset === option.id}
                          aria-label={`${option.label} accent`}
                        >
                          <span
                            className={`arco-accent-preset-swatch__preview ${option.preview ? "" : "arco-accent-preset-swatch__preview--mono"}`}
                            style={option.preview ? { background: option.preview } : undefined}
                          />
                          <span className="arco-accent-preset-swatch__label">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </SettingsFieldRow>
                  <SettingsFieldRow
                    label={i18n.t(I18nKey.APPS$SETTINGS_CORNER_RADIUS)}
                    hint="Roundness for buttons, inputs, panels, and windows."
                    alignTop
                  >
                    <div className="arco-radius-preset-grid">
                      {RADIUS_PRESET_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`arco-radius-preset-swatch ${radiusPreset === option.id ? "arco-radius-preset-swatch--active" : ""}`}
                          onClick={() => setRadiusPreset(option.id)}
                          aria-pressed={radiusPreset === option.id}
                          aria-label={`${option.label} corners`}
                        >
                          <span className={`arco-radius-preset-swatch__preview arco-radius-preset-swatch__preview--${option.id}`} />
                          <span className="arco-radius-preset-swatch__label">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </SettingsFieldRow>
                  <SettingsFieldRow
                    label={i18n.t(I18nKey.APPS$SETTINGS_WINDOW_CONTROLS)}
                    hint="Close, minimize, and maximize buttons in the desktop window title bar."
                    alignTop
                  >
                    <div className="arco-window-control-preset-grid">
                      {WINDOW_CONTROL_STYLE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`arco-window-control-preset-swatch ${windowControlStyle === option.id ? "arco-window-control-preset-swatch--active" : ""}`}
                          onClick={() => setWindowControlStyle(option.id)}
                          aria-pressed={windowControlStyle === option.id}
                          aria-label={`${option.label} window controls`}
                        >
                          <span
                            className={`arco-window-control-preset-swatch__preview arco-window-control-preset-swatch__preview--${option.id}`}
                          />
                          <span className="arco-window-control-preset-swatch__label">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </SettingsFieldRow>
                  <SettingsFieldRow
                    label={i18n.t(I18nKey.APPS$SETTINGS_CONTROL_ALIGNMENT)}
                    hint="Place window controls on the left (macOS-style) or right (Windows-style)."
                  >
                    <SettingsChipRow>
                      {WINDOW_CONTROL_ALIGN_OPTIONS.map((option) => (
                        <Chip
                          key={option.id}
                          active={windowControlAlign === option.id}
                          onClick={() => setWindowControlAlign(option.id)}
                        >
                          {option.label}
                        </Chip>
                      ))}
                    </SettingsChipRow>
                  </SettingsFieldRow>
                  <SettingsFieldRow
                    label="Allow windows off-screen"
                    hint="Let desktop windows hang past the browser edge. A strip of the title bar stays on-screen so you can drag them back."
                  >
                    <Switch
                      checked={windowsOffscreen}
                      onChange={(event) => {
                        const enabled = event.target.checked;
                        setWindowsOffscreen(enabled);
                        if (!enabled) constrainWindowsToViewport();
                      }}
                      aria-label="Allow windows off-screen"
                    />
                  </SettingsFieldRow>
                  {isArcoDesktop() && (
                    <SettingsFieldRow
                      label="Software updates"
                      hint="Kosmos checks for updates in the background and prompts you to restart when a new build is ready."
                    >
                      <DesktopUpdatesSection />
                    </SettingsFieldRow>
                  )}
                  {isArcoDesktop() && (
                    <SettingsFieldRow
                      label={i18n.t(I18nKey.APPS$SETTINGS_APP_WINDOWS)}
                      hint="In Desktop view, open each app in its own window or inside the main Arco window."
                    >
                      <SettingsChipRow>
                        {(
                          [
                            { id: "embedded", label: "Inside main window" },
                            { id: "native", label: "Separate windows" },
                          ] as const
                        ).map((option) => (
                          <Chip
                            key={option.id}
                            active={appWindowHost === option.id}
                            onClick={() => setAppWindowHost(option.id as AppWindowHost)}
                          >
                            {option.label}
                          </Chip>
                        ))}
                      </SettingsChipRow>
                    </SettingsFieldRow>
                  )}
                  <SettingsFieldRow
                    label={i18n.t(I18nKey.APPS$SETTINGS_SPACE_RIG)}
                    hint="Choose the assistant face renderer used in voice chat and previews."
                  >
                    <SettingsChipRow>
                      {FACE_RIG_OPTIONS.map((option) => (
                        <Chip
                          key={option.id}
                          active={faceRigId === option.id}
                          onClick={() => setFaceRigId(option.id)}
                        >
                          {option.label}
                        </Chip>
                      ))}
                    </SettingsChipRow>
                  </SettingsFieldRow>
                  <SettingsFieldRow
                    label={i18n.t(I18nKey.APPS$SETTINGS_ASSISTANT_FACE)}
                    hint="Background color for rigs that support it (Minimal and Round). Use the preview to try speaking states and expressions."
                    alignTop
                  >
                    <div className="arco-settings-face-color">
                      <div className="arco-settings-face-color__options">
                        <div className="arco-face-color-grid">
                          {FACE_BG_OPTIONS.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              className={`arco-face-color-swatch ${faceBg === option.id ? "arco-face-color-swatch--active" : ""}`}
                              onClick={() => setFaceBg(option.id)}
                              aria-pressed={faceBg === option.id}
                              aria-label={`${option.label} face background`}
                            >
                              <span
                                className={`arco-face-color-swatch__preview ${option.preview ? "" : "arco-face-color-swatch__preview--mono"}`}
                                style={option.preview ? { background: option.preview } : undefined}
                              />
                              <span className="arco-face-color-swatch__label">{option.label}</span>
                            </button>
                          ))}
                        </div>
                        <label className="arco-settings-face-color__custom">
                          <span className="arco-settings-face-color__custom-label"><T k={I18nKey.APPS$SETTINGS_CUSTOM} /></span>
                          <input
                            type="color"
                            className="arco-settings-face-color__input"
                            value={isCustomFaceBg(faceBg) ? faceBg : "#7c9dff"}
                            onChange={(e) => setFaceBg(e.target.value)}
                            aria-label={i18n.t(I18nKey.APPS$SETTINGS_CUSTOM_FACE_BACKGROUND_COLOR)}
                          />
                        </label>
                      </div>
                      <FacePreviewWidget />
                    </div>
                  </SettingsFieldRow>
                  <SettingsFieldRow label={i18n.t(I18nKey.APPS$SETTINGS_NAV_BRAND)} hint="Shown at the top of the left nav rail." alignTop>
                    <div className="arco-settings-nav-brand">
                      <NavBrandMark />
                      <div className="arco-settings-nav-brand__actions">
                        <label className="arco-btn arco-settings-nav-brand__upload"><T k={I18nKey.APPS$SETTINGS_CHOOSE_IMAGE} /><input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (!file) return;
                              if (!file.type.startsWith("image/")) {
                                notify("Choose an image file.");
                                return;
                              }
                              if (file.size > NAV_BRAND_MAX_BYTES) {
                                notify("Image must be 512 KB or smaller.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () => {
                                if (typeof reader.result === "string") setNavBrandImage(reader.result);
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        {navBrandImage ? (
                          <Button variant="ghost" onClick={() => setNavBrandImage(null)}><T k={I18nKey.APPS$SETTINGS_RESET_TO_DEFAULT} /></Button>
                        ) : null}
                      </div>
                    </div>
                  </SettingsFieldRow>
                </SettingsStack>
              </SettingsSection>
            </SettingsPage>
          )}

          {activeSection === "wallpaper" && (
            <SettingsPage>
              <SettingsSection intro="Desktop background and sign-in screen wallpaper.">
                <SettingsStack>
                  <WallpaperSettings />
                </SettingsStack>
              </SettingsSection>
            </SettingsPage>
          )}

          {activeSection === "apps" && <AppsSection />}
          {activeSection === "server" && mobileShellNeedsServerProfile() && <ServerProfilesSection />}
          {activeSection === "tools" && <ToolsSection />}
          {activeSection === "mcp" && <McpServersSection />}
          {activeSection === "skills" && <SkillsSection />}
          {activeSection === "memory" && canWriteSettings && <MemorySection />}
          {activeSection === "channels" && <ChannelsSection />}
          {activeSection === "accounts" && <ConnectedAccountsSection />}
          {activeSection === "permissions" && canWriteSettings && <AgentSection />}
          {activeSection === "providers" && <ProvidersSection />}
          {activeSection === "external" && <ExternalAccessSection />}
          {activeSection === "usage" && <UsageSection />}
          {(activeSection === "subscriptions" || activeSection === "billing") && <BillingSection />}
          {activeSection === "kosmos-cloud" && isArcoDesktop() && <KosmosCloudSection />}
          {activeSection === "downloads" && <PlatformDownloadsSection />}
          {activeSection === "password" && <PasswordSection />}
          {activeSection === "users" && canManageUsers && <UsersSection />}
        </div>
      </div>
    </div>
  );
}
