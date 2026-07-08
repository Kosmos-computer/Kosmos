import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Static previews of first-run screens — no store/API side effects.
 * Shapes the eventual onboarding flow before install wiring exists.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { ArcoLogo } from "../../components/ArcoLogo";
import { AuthWallpaperBackdrop } from "../../os/wallpaper/AuthWallpaperBackdrop";
import { BootScreen } from "../../os/auth/screens";
import { Button, Chip, Input, Switch } from "../../components/ui";

function PreviewCard({ branding, children }: { branding?: ReactNode; children: ReactNode }) {
  return (
    <div className="arco-authscreen">
      <AuthWallpaperBackdrop />
      <div className="arco-authscreen__stack">
        {branding ? <div className="arco-authscreen__branding">{branding}</div> : null}
        <div className="arco-authscreen__card">{children}</div>
      </div>
    </div>
  );
}

export function BootPreview() {
  return <BootScreen />;
}

export function WelcomePreview() {
  return (
    <PreviewCard branding={<ArcoLogo className="arco-authscreen__logo" />}>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__lead"><T k={I18nKey.APPS$STARTUP_WELCOME_TO_ARCO} /></div>
        <div className="arco-authscreen__subtitle"><T k={I18nKey.APPS$STARTUP_SET_UP_YOUR_WORKSPACE_MODELS_AND_ACCOUNT_IN_A_FEW_STEPS} /></div>
      </div>
      <Button variant="primary" style={{ justifyContent: "center" }}><T k={I18nKey.APPS$STARTUP_GET_STARTED} /></Button>
    </PreviewCard>
  );
}

export function StoragePreview() {
  const [path, setPath] = useState("~/Library/Application Support/Arco");

  return (
    <PreviewCard>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__title"><T k={I18nKey.APPS$STARTUP_CHOOSE_DATA_LOCATION} /></div>
        <div className="arco-authscreen__subtitle"><T k={I18nKey.APPS$STARTUP_SETTINGS_CHAT_HISTORY_AND_MODEL_FILES_LIVE_HERE_PICK_A_D} /></div>
      </div>
      <form
        className="arco-authscreen__form"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
        }}
      >
        <div>
          <label className="arco-label" htmlFor="startup-storage-path"><T k={I18nKey.APPS$STARTUP_DATA_FOLDER} /></label>
          <Input
            id="startup-storage-path"
            width="auto"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
        </div>
        <p className="arco-startup-preview__hint"><T k={I18nKey.APPS$STARTUP_REQUIRES_ABOUT_12_GB_FREE_FOR_A_STARTER_LOCAL_MODEL} /></p>
        <Button variant="primary" type="submit" style={{ justifyContent: "center" }}><T k={I18nKey.COMMON$CONTINUE} /></Button>
      </form>
    </PreviewCard>
  );
}

export function DockerPreview() {
  const [enabled, setEnabled] = useState(false);

  return (
    <PreviewCard>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__title"><T k={I18nKey.APPS$STARTUP_DOCKER_OPTIONAL} /></div>
        <div className="arco-authscreen__subtitle"><T k={I18nKey.APPS$STARTUP_ENABLE_CONTAINERIZED_TOOLS_AND_SANDBOXED_AUTOMATIONS_YOU} /></div>
      </div>
      <div className="arco-startup-preview__toggle-row">
        <div>
          <div className="arco-startup-preview__toggle-label"><T k={I18nKey.APPS$STARTUP_USE_DOCKER_WHEN_AVAILABLE} /></div>
          <div className="arco-startup-preview__toggle-hint"><T k={I18nKey.APPS$STARTUP_REQUIRES_DOCKER_DESKTOP_OR_A_COMPATIBLE_RUNTIME} /></div>
        </div>
        <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} aria-label={i18n.t(I18nKey.APPS$STARTUP_ENABLE_DOCKER)} />
      </div>
      <div className="arco-startup-preview__actions">
        <Button variant="ghost"><T k={I18nKey.APPS$STARTUP_SKIP_FOR_NOW} /></Button>
        <Button variant="primary"><T k={I18nKey.COMMON$CONTINUE} /></Button>
      </div>
    </PreviewCard>
  );
}

const MODEL_PATHS = [
  { id: "cloud", label: "Cloud API", hint: "OpenAI, Anthropic, OpenRouter…" },
  { id: "local", label: "Local models", hint: "Download GGUF models on this machine" },
  { id: "ollama", label: "Ollama", hint: "Use an existing Ollama install" },
] as const;

export function ModelSelectPreview() {
  const [path, setPath] = useState<(typeof MODEL_PATHS)[number]["id"]>("local");

  return (
    <PreviewCard>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__mark" />
        <div className="arco-authscreen__title"><T k={I18nKey.APPS$STARTUP_HOW_SHOULD_ARCO_RUN_MODELS} /></div>
        <div className="arco-authscreen__subtitle"><T k={I18nKey.APPS$STARTUP_YOU_CAN_ADD_MORE_PROVIDERS_AFTER_SETUP} /></div>
      </div>
      <div className="arco-startup-preview__path-grid">
        {MODEL_PATHS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`arco-startup-preview__path-card ${path === option.id ? "arco-startup-preview__path-card--active" : ""}`}
            onClick={() => setPath(option.id)}
            aria-pressed={path === option.id}
          >
            <span className="arco-startup-preview__path-label">{option.label}</span>
            <span className="arco-startup-preview__path-hint">{option.hint}</span>
          </button>
        ))}
      </div>
      <Button variant="primary" style={{ justifyContent: "center" }}><T k={I18nKey.COMMON$CONTINUE} /></Button>
    </PreviewCard>
  );
}

const STARTER_MODELS = [
  { id: "qwen17", label: "Qwen3 1.7B", size: "1.2 GB", tag: "Recommended" },
  { id: "lfm2", label: "LFM2 1.2B", size: "0.9 GB", tag: "Fastest" },
  { id: "qwen4", label: "Qwen3 4B", size: "2.8 GB", tag: "Balanced" },
] as const;

export function ModelSetupPreview() {
  const [model, setModel] = useState<(typeof STARTER_MODELS)[number]["id"]>("qwen17");

  return (
    <PreviewCard>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__title"><T k={I18nKey.APPS$STARTUP_PICK_A_STARTER_MODEL} /></div>
        <div className="arco-authscreen__subtitle"><T k={I18nKey.APPS$STARTUP_DOWNLOAD_HAPPENS_IN_THE_BACKGROUND_TOOL_CALLING_MODELS_W} /></div>
      </div>
      <div className="arco-startup-preview__model-list">
        {STARTER_MODELS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`arco-startup-preview__model-row ${model === entry.id ? "arco-startup-preview__model-row--active" : ""}`}
            onClick={() => setModel(entry.id)}
            aria-pressed={model === entry.id}
          >
            <span>
              <span className="arco-startup-preview__model-label">{entry.label}</span>
              <span className="arco-startup-preview__model-meta">{entry.size}</span>
            </span>
            <Chip active={model === entry.id}>{entry.tag}</Chip>
          </button>
        ))}
      </div>
      <div className="arco-startup-preview__progress" aria-hidden>
        <div className="arco-startup-preview__progress-bar">
          <div className="arco-startup-preview__progress-fill" style={{ width: "38%" }} />
        </div>
        <span className="arco-startup-preview__progress-label"><T k={I18nKey.APPS$STARTUP_PREVIEW_DOWNLOAD_NOT_STARTED} /></span>
      </div>
      <Button variant="primary" style={{ justifyContent: "center" }}><T k={I18nKey.APPS$STARTUP_DOWNLOAD_AND_CONTINUE} /></Button>
    </PreviewCard>
  );
}

const PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "mock", label: "Mock (dev)" },
] as const;

export function ProviderPreview() {
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]["id"]>("openai");

  return (
    <PreviewCard>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__title"><T k={I18nKey.APPS$STARTUP_CONNECT_A_PROVIDER} /></div>
        <div className="arco-authscreen__subtitle"><T k={I18nKey.APPS$STARTUP_KEYS_ARE_STORED_ON_THIS_MACHINE_AND_SHOWN_MASKED_IN_SETT} /></div>
      </div>
      <form
        className="arco-authscreen__form"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
        }}
      >
        <div>
          <label className="arco-label"><T k={I18nKey.APPS$STARTUP_PROVIDER} /></label>
          <div className="arco-startup-preview__chips">
            {PROVIDERS.map((entry) => (
              <Chip key={entry.id} active={provider === entry.id} onClick={() => setProvider(entry.id)}>
                {entry.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <label className="arco-label" htmlFor="startup-provider-key"><T k={I18nKey.APPS$STARTUP_API_KEY} /></label>
          <Input id="startup-provider-key" width="auto" type="password" placeholder={i18n.t(I18nKey.INSTALL$API_KEY_PLACEHOLDER)} />
        </div>
        <Button variant="primary" type="submit" style={{ justifyContent: "center" }}><T k={I18nKey.APPS$STARTUP_SAVE_AND_CONTINUE} /></Button>
      </form>
    </PreviewCard>
  );
}

export function UserPreview() {
  return (
    <PreviewCard>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__mark" />
        <div className="arco-authscreen__title"><T k={I18nKey.APPS$STARTUP_CREATE_OWNER_ACCOUNT} /></div>
        <div className="arco-authscreen__subtitle"><T k={I18nKey.APPS$STARTUP_SECURE_THIS_INSTANCE_ADDITIONAL_USERS_CAN_BE_INVITED_LAT} /></div>
      </div>
      <form
        className="arco-authscreen__form"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
        }}
      >
        <div>
          <label className="arco-label" htmlFor="startup-user-name"><T k={I18nKey.APPS$STARTUP_USERNAME} /></label>
          <Input id="startup-user-name" width="auto" defaultValue="owner" />
        </div>
        <div>
          <label className="arco-label" htmlFor="startup-user-display"><T k={I18nKey.APPS$STARTUP_DISPLAY_NAME_OPTIONAL} /></label>
          <Input id="startup-user-display" width="auto" placeholder={i18n.t(I18nKey.APPS$STARTUP_ALEX)} />
        </div>
        <div>
          <label className="arco-label" htmlFor="startup-user-password"><T k={I18nKey.APPS$STARTUP_PASSWORD} /></label>
          <Input id="startup-user-password" width="auto" type="password" autoComplete="new-password" />
        </div>
        <Button variant="primary" type="submit" style={{ justifyContent: "center" }}><T k={I18nKey.APPS$STARTUP_CREATE_ACCOUNT} /></Button>
      </form>
    </PreviewCard>
  );
}

export function StartupPreviewForStep({ stepId }: { stepId: import("./startupSteps").StartupStepId }) {
  switch (stepId) {
    case "boot":
      return <BootPreview />;
    case "welcome":
      return <WelcomePreview />;
    case "storage":
      return <StoragePreview />;
    case "docker":
      return <DockerPreview />;
    case "model-select":
      return <ModelSelectPreview />;
    case "model-setup":
      return <ModelSetupPreview />;
    case "provider":
      return <ProviderPreview />;
    case "user":
      return <UserPreview />;
  }
}
