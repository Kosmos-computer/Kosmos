import i18n from "../../i18n/index";
/**
 * First-run install wizard — walks a fresh instance from welcome through LLM
 * provider choice to owner account creation. Replaces the bare SetupScreen
 * while needsSetup is true.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ArcoLogo } from "../../components/ArcoLogo";
import { Button, Chip, Input } from "../../components/ui";
import type { InstallStatus, LlmProvider, Settings } from "@shared/types";
import { PROVIDER_PRESETS } from "@shared/types";
import { api } from "../../lib/api";
import { useAuthStore } from "./authStore";
import { AuthWallpaperBackdrop } from "../wallpaper/AuthWallpaperBackdrop";
import { I18nKey } from "../../i18n/declaration";

type InstallStep = "welcome" | "model-path" | "provider" | "account";
type ModelPath = "mock" | "cloud" | "local" | "ollama";

function InstallCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="arco-authscreen">
      <AuthWallpaperBackdrop />
      <div className="arco-authscreen__stack">
        <div className="arco-authscreen__branding">
          <ArcoLogo className="arco-authscreen__logo" />
        </div>
        <div className="arco-authscreen__card">{children}</div>
      </div>
    </div>
  );
}

function StepProgress({ step, total }: { step: number; total: number }) {
  const { t } = useTranslation();
  return (
    <div className="arco-install__progress" aria-label={i18n.t(I18nKey.INSTALL$STEP_PROGRESS, { step, total })}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`arco-install__dot ${index < step ? "arco-install__dot--done" : ""} ${index === step - 1 ? "arco-install__dot--active" : ""}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

function InstallChecks({ status }: { status: InstallStatus | null }) {
  const { t } = useTranslation();
  if (!status || status.ready) return null;
  const failing = status.checks.filter((check) => check.required && !check.ok);
  if (failing.length === 0) return null;

  const packaged = status.packaged === true;

  return (
    <div className="arco-install__checks" role="status">
      <div className="arco-install__checks-title">
        {packaged ? i18n.t(I18nKey.INSTALL$CHECKS_TITLE_PACKAGED) : i18n.t(I18nKey.INSTALL$CHECKS_TITLE_DEV)}
      </div>
      <p className="arco-install__checks-lead">
        {packaged ? (
          i18n.t(I18nKey.INSTALL$CHECKS_LEAD_PACKAGED)
        ) : (
          <>
            {i18n.t(I18nKey.INSTALL$CHECKS_LEAD_DEV_PREFIX)}{" "}
            {/* eslint-disable-next-line i18next/no-literal-string -- shell command */}
            <code>npm run setup</code>
            {i18n.t(I18nKey.INSTALL$CHECKS_LEAD_DEV_SUFFIX)}
          </>
        )}
      </p>
      <ul className="arco-install__checks-list">
        {failing.map((check) => (
          <li key={check.id}>
            <span className="arco-install__checks-label">{check.label}</span>
            {check.hint ? <span className="arco-install__checks-hint">{check.hint}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function settingsForPath(path: ModelPath, cloudProvider: LlmProvider, apiKey: string): Partial<Settings> {
  if (path === "mock") return { provider: "mock", apiKey: "", baseUrl: "", model: "mock" };
  if (path === "local") {
    const preset = PROVIDER_PRESETS.local;
    return { provider: "local", baseUrl: preset.baseUrl, model: preset.model, apiKey: "" };
  }
  if (path === "ollama") {
    const preset = PROVIDER_PRESETS.ollama;
    return { provider: "ollama", baseUrl: preset.baseUrl, model: preset.model, apiKey: "" };
  }
  const preset = PROVIDER_PRESETS[cloudProvider as keyof typeof PROVIDER_PRESETS];
  return {
    provider: cloudProvider,
    baseUrl: preset?.baseUrl ?? "",
    model: preset?.model ?? "",
    apiKey: apiKey.trim(),
  };
}

export function InstallFlow() {
  const { t } = useTranslation();
  const setup = useAuthStore((s) => s.setup);
  const clearError = useAuthStore((s) => s.clearError);
  const error = useAuthStore((s) => s.error);

  const modelPaths = useMemo(
    () =>
      [
        { id: "mock" as const, label: i18n.t(I18nKey.INSTALL$MODEL_PATH_MOCK_LABEL), hint: i18n.t(I18nKey.INSTALL$MODEL_PATH_MOCK_HINT) },
        { id: "cloud" as const, label: i18n.t(I18nKey.INSTALL$MODEL_PATH_CLOUD_LABEL), hint: i18n.t(I18nKey.INSTALL$MODEL_PATH_CLOUD_HINT) },
        { id: "local" as const, label: i18n.t(I18nKey.INSTALL$MODEL_PATH_LOCAL_LABEL), hint: i18n.t(I18nKey.INSTALL$MODEL_PATH_LOCAL_HINT) },
        { id: "ollama" as const, label: i18n.t(I18nKey.INSTALL$MODEL_PATH_OLLAMA_LABEL), hint: i18n.t(I18nKey.INSTALL$MODEL_PATH_OLLAMA_HINT) },
      ] satisfies { id: ModelPath; label: string; hint: string }[],
    [t],
  );

  const cloudProviders = useMemo(
    () =>
      [
        // Brand names — intentionally not localized.
        { id: "openai" as const, label: "OpenAI" },
        { id: "anthropic" as const, label: "Anthropic" },
        { id: "openrouter" as const, label: "OpenRouter" },
      ] satisfies { id: Exclude<LlmProvider, "custom" | "mock" | "local" | "ollama">; label: string }[],
    [],
  );

  const [step, setStep] = useState<InstallStep>("welcome");
  const [installStatus, setInstallStatus] = useState<InstallStatus | null>(null);
  const [modelPath, setModelPath] = useState<ModelPath>("mock");
  const [cloudProvider, setCloudProvider] = useState<LlmProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api.installStatus().then(setInstallStatus).catch(() => setInstallStatus(null));
  }, []);

  const stepOrder: InstallStep[] =
    modelPath === "cloud"
      ? ["welcome", "model-path", "provider", "account"]
      : ["welcome", "model-path", "account"];
  const stepNumber = stepOrder.indexOf(step) + 1;
  const stepTotal = stepOrder.length;

  const goNextFromModelPath = () => {
    setStep(modelPath === "cloud" ? "provider" : "account");
  };

  const submitAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setLocalError(i18n.t(I18nKey.INSTALL$PASSWORD_MISMATCH));
      return;
    }
    setLocalError(null);
    clearError();
    setBusy(true);
    await setup({
      username,
      displayName: displayName || undefined,
      password,
      settings: settingsForPath(modelPath, cloudProvider, apiKey),
    });
    setBusy(false);
  };

  return (
    <InstallCard>
      <StepProgress step={stepNumber} total={stepTotal} />

      {step === "welcome" && (
        <>
          <div className="arco-authscreen__header">
            <div className="arco-authscreen__lead">{i18n.t(I18nKey.INSTALL$WELCOME_LEAD)}</div>
            <div className="arco-authscreen__subtitle">{i18n.t(I18nKey.INSTALL$WELCOME_SUBTITLE)}</div>
          </div>
          <InstallChecks status={installStatus} />
          <Button variant="primary" style={{ justifyContent: "center" }} onClick={() => setStep("model-path")}>
            {i18n.t(I18nKey.INSTALL$GET_STARTED)}
          </Button>
        </>
      )}

      {step === "model-path" && (
        <>
          <div className="arco-authscreen__header">
            <div className="arco-authscreen__title">{i18n.t(I18nKey.INSTALL$MODEL_PATH_TITLE)}</div>
            <div className="arco-authscreen__subtitle">{i18n.t(I18nKey.INSTALL$MODEL_PATH_SUBTITLE)}</div>
          </div>
          <div className="arco-startup-preview__path-grid">
            {modelPaths.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`arco-startup-preview__path-card ${modelPath === option.id ? "arco-startup-preview__path-card--active" : ""}`}
                onClick={() => setModelPath(option.id)}
                aria-pressed={modelPath === option.id}
              >
                <span className="arco-startup-preview__path-label">{option.label}</span>
                <span className="arco-startup-preview__path-hint">{option.hint}</span>
              </button>
            ))}
          </div>
          <div className="arco-startup-preview__actions">
            <Button variant="ghost" onClick={() => setStep("welcome")}>
              {i18n.t(I18nKey.COMMON$BACK)}
            </Button>
            <Button variant="primary" onClick={goNextFromModelPath}>
              {i18n.t(I18nKey.COMMON$CONTINUE)}
            </Button>
          </div>
        </>
      )}

      {step === "provider" && (
        <>
          <div className="arco-authscreen__header">
            <div className="arco-authscreen__title">{i18n.t(I18nKey.INSTALL$PROVIDER_TITLE)}</div>
            <div className="arco-authscreen__subtitle">{i18n.t(I18nKey.INSTALL$PROVIDER_SUBTITLE)}</div>
          </div>
          <form
            className="arco-authscreen__form"
            onSubmit={(e) => {
              e.preventDefault();
              setStep("account");
            }}
          >
            <div>
              <label className="arco-label">{i18n.t(I18nKey.INSTALL$PROVIDER_LABEL)}</label>
              <div className="arco-startup-preview__chips">
                {cloudProviders.map((entry) => (
                  <Chip
                    key={entry.id}
                    active={cloudProvider === entry.id}
                    onClick={() => setCloudProvider(entry.id)}
                  >
                    {entry.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <label className="arco-label" htmlFor="install-api-key">
                {i18n.t(I18nKey.INSTALL$API_KEY_LABEL)}
              </label>
              <Input
                id="install-api-key"
                width="auto"
                type="password"
                placeholder={i18n.t(I18nKey.INSTALL$API_KEY_PLACEHOLDER)}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="arco-startup-preview__actions">
              <Button type="button" variant="ghost" onClick={() => setStep("model-path")}>
                {i18n.t(I18nKey.COMMON$BACK)}
              </Button>
              <Button type="submit" variant="primary">
                {i18n.t(I18nKey.COMMON$CONTINUE)}
              </Button>
            </div>
          </form>
        </>
      )}

      {step === "account" && (
        <>
          <div className="arco-authscreen__header">
            <div className="arco-authscreen__mark" />
            <div className="arco-authscreen__title">{i18n.t(I18nKey.INSTALL$ACCOUNT_TITLE)}</div>
            <div className="arco-authscreen__subtitle">{i18n.t(I18nKey.INSTALL$ACCOUNT_SUBTITLE)}</div>
          </div>
          <form className="arco-authscreen__form" onSubmit={(e) => void submitAccount(e)}>
            <div>
              <label className="arco-label" htmlFor="install-username">
                {i18n.t(I18nKey.INSTALL$USERNAME_LABEL)}
              </label>
              <Input
                id="install-username"
                width="auto"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="arco-label" htmlFor="install-display">
                {i18n.t(I18nKey.INSTALL$DISPLAY_NAME_LABEL)}
              </label>
              <Input
                id="install-display"
                width="auto"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <label className="arco-label" htmlFor="install-password">
                {i18n.t(I18nKey.INSTALL$PASSWORD_LABEL)}
              </label>
              <Input
                id="install-password"
                width="auto"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="arco-label" htmlFor="install-confirm">
                {i18n.t(I18nKey.INSTALL$CONFIRM_PASSWORD_LABEL)}
              </label>
              <Input
                id="install-confirm"
                width="auto"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {localError ? (
              <div className="arco-authscreen__error" role="alert">
                {localError}
              </div>
            ) : null}
            {error ? (
              <div className="arco-authscreen__error" role="alert">
                {error}
              </div>
            ) : null}
            <div className="arco-startup-preview__actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(modelPath === "cloud" ? "provider" : "model-path")}
              >
                {i18n.t(I18nKey.COMMON$BACK)}
              </Button>
              <Button variant="primary" type="submit" disabled={busy}>
                {busy ? i18n.t(I18nKey.INSTALL$CREATING) : i18n.t(I18nKey.INSTALL$FINISH_SETUP)}
              </Button>
            </div>
          </form>
        </>
      )}
    </InstallCard>
  );
}
