import i18n from "../../i18n/index";
/**
 * First-run install wizard — walks a fresh instance from welcome through LLM
 * provider choice to owner account creation. Replaces the bare SetupScreen
 * while needsSetup is true.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Circle, CircleAlert, CircleCheck, Link2, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ArcoLogo } from "../../components/ArcoLogo";
import { Button, Chip, Input } from "../../components/ui";
import type { InstallStatus, LlmProvider, Settings } from "@shared/types";
import { PROVIDER_PRESETS } from "@shared/types";
import { api } from "../../lib/api";
import { useDeployment } from "../../hooks/useDeployment";
import {
  normalizeServerUrl,
  reloadForServerSwitch,
  testServerConnection,
  upsertServerProfile,
} from "../server/serverProfileStore";
import {
  consumeKosmosConnectError,
  kosmosConnectReturnUrl,
} from "../server/kosmosConnectReturn";
import { useAuthStore } from "./authStore";
import { AuthWallpaperBackdrop } from "../wallpaper/AuthWallpaperBackdrop";
import { I18nKey } from "../../i18n/declaration";
import { tWithFallback } from "../../i18n/fallbackT";

type InstallStep = "welcome" | "model-path" | "kosmos-connect" | "provider" | "account";
type ModelPath = "kosmos" | "mock" | "cloud" | "local" | "ollama";

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

/** Split actionable hint text from trailing technical error details. */
function splitCheckHint(hint: string | undefined): { lead?: string; detail?: string } {
  if (!hint) return {};
  const techMatch = hint.match(/\s(Cannot find package|Error:|ERR_|ENOENT).*$/i);
  if (techMatch?.index != null && techMatch.index > 0) {
    return {
      lead: hint.slice(0, techMatch.index).trim(),
      detail: hint.slice(techMatch.index).trim(),
    };
  }
  return { lead: hint };
}

function InstallChecks({ status }: { status: InstallStatus | null }) {
  if (!status || status.ready) return null;

  const required = status.checks.filter((check) => check.required);
  const readyCount = required.filter((check) => check.ok).length;
  if (readyCount === required.length) return null;

  const packaged = status.packaged === true;
  const progress = required.length > 0 ? (readyCount / required.length) * 100 : 0;

  return (
    <div className="arco-install__checks" role="status">
      <div className="arco-install__checks-head">
        <CircleAlert className="arco-install__checks-icon" size={18} strokeWidth={2} aria-hidden />
        <div className="arco-install__checks-head-text">
          <div className="arco-install__checks-title">
            {packaged ? i18n.t(I18nKey.INSTALL$CHECKS_TITLE_PACKAGED) : i18n.t(I18nKey.INSTALL$CHECKS_TITLE_DEV)}
          </div>
          {packaged ? (
            <p className="arco-install__checks-lead">{i18n.t(I18nKey.INSTALL$CHECKS_LEAD_PACKAGED)}</p>
          ) : (
            <p className="arco-install__checks-lead">
              {i18n.t(I18nKey.INSTALL$CHECKS_LEAD_DEV_PREFIX)}
              {i18n.t(I18nKey.INSTALL$CHECKS_LEAD_DEV_SUFFIX)}
            </p>
          )}
        </div>
      </div>

      {!packaged ? (
        <div className="arco-install__checks-cmd">
          <Terminal className="arco-install__checks-cmd-icon" size={14} strokeWidth={2} aria-hidden />
          {/* eslint-disable-next-line i18next/no-literal-string -- shell command */}
          <code>npm run setup</code>
        </div>
      ) : null}

      <div className="arco-install__checks-meter" aria-hidden>
        <div className="arco-install__checks-meter-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="arco-install__checks-meter-label">
        {readyCount} / {required.length}
      </div>

      <ul className="arco-install__checks-list">
        {required.map((check) => {
          const { lead, detail } = splitCheckHint(check.hint);
          return (
            <li
              key={check.id}
              className={`arco-install__checks-item ${check.ok ? "arco-install__checks-item--ok" : "arco-install__checks-item--fail"}`}
            >
              {check.ok ? (
                <CircleCheck className="arco-install__checks-status arco-install__checks-status--ok" size={16} strokeWidth={2} aria-hidden />
              ) : (
                <Circle className="arco-install__checks-status arco-install__checks-status--fail" size={16} strokeWidth={2} aria-hidden />
              )}
              <div className="arco-install__checks-body">
                <span className="arco-install__checks-label">{check.label}</span>
                {!check.ok && lead ? <span className="arco-install__checks-hint">{lead}</span> : null}
                {!check.ok && detail ? <code className="arco-install__checks-detail">{detail}</code> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const MODEL_PATH_OPTIONS = [
  { id: "kosmos", labelKey: I18nKey.INSTALL$MODEL_PATH_KOSMOS_LABEL, hintKey: I18nKey.INSTALL$MODEL_PATH_KOSMOS_HINT },
  { id: "mock", labelKey: I18nKey.INSTALL$MODEL_PATH_MOCK_LABEL, hintKey: I18nKey.INSTALL$MODEL_PATH_MOCK_HINT },
  { id: "cloud", labelKey: I18nKey.INSTALL$MODEL_PATH_CLOUD_LABEL, hintKey: I18nKey.INSTALL$MODEL_PATH_CLOUD_HINT },
  { id: "local", labelKey: I18nKey.INSTALL$MODEL_PATH_LOCAL_LABEL, hintKey: I18nKey.INSTALL$MODEL_PATH_LOCAL_HINT },
  { id: "ollama", labelKey: I18nKey.INSTALL$MODEL_PATH_OLLAMA_LABEL, hintKey: I18nKey.INSTALL$MODEL_PATH_OLLAMA_HINT },
] as const satisfies ReadonlyArray<{ id: ModelPath; labelKey: I18nKey; hintKey: I18nKey }>;

function InstallKosmosConnect({
  controlPlaneUrl,
  url,
  onUrlChange,
  error,
  busy,
  onConnect,
}: {
  controlPlaneUrl: string;
  url: string;
  onUrlChange: (value: string) => void;
  error: string | null;
  busy: boolean;
  onConnect: () => void;
}) {
  const { t, i18n } = useTranslation();
  const copy = (key: I18nKey) => tWithFallback(key, t, i18n.language);

  const openWebConnect = (mode: "existing" | "signup") => {
    window.location.href = kosmosConnectReturnUrl(controlPlaneUrl, mode);
  };

  return (
    <div className="arco-install__kosmos-connect">
      <p className="arco-install__kosmos-connect-lead">{copy(I18nKey.INSTALL$KOSMOS_CONNECT_WEB_LEAD)}</p>
      <div className="arco-install__kosmos-connect-actions">
        <Button onClick={() => openWebConnect("existing")} style={{ justifyContent: "center" }}>
          <Link2 size={14} aria-hidden />
          {copy(I18nKey.INSTALL$KOSMOS_CONNECT_WEB)}
        </Button>
        <Button variant="ghost" onClick={() => openWebConnect("signup")} style={{ justifyContent: "center" }}>
          {copy(I18nKey.INSTALL$KOSMOS_CREATE_ACCOUNT)}
        </Button>
      </div>
      <details className="arco-install__kosmos-connect-advanced">
        <summary>{copy(I18nKey.INSTALL$KOSMOS_MANUAL_URL)}</summary>
        <div className="arco-install__kosmos-connect-advanced-body">
          <label className="arco-label" htmlFor="install-kosmos-url">
            {copy(I18nKey.INSTALL$KOSMOS_INSTANCE_URL_LABEL)}
          </label>
          <Input
            id="install-kosmos-url"
            value={url}
            placeholder={copy(I18nKey.INSTALL$KOSMOS_INSTANCE_URL_PLACEHOLDER)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="url"
            onChange={(e) => onUrlChange(e.target.value)}
          />
          <Button onClick={onConnect} disabled={busy || !url.trim()} style={{ justifyContent: "center" }}>
            {busy ? copy(I18nKey.INSTALL$KOSMOS_CONNECTING) : copy(I18nKey.INSTALL$KOSMOS_CONNECT)}
          </Button>
        </div>
      </details>
      {error ? (
        <div className="arco-authscreen__error" role="alert">
          {error}
        </div>
      ) : null}
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
  const { t, i18n } = useTranslation();
  const { deployment } = useDeployment();
  const setup = useAuthStore((s) => s.setup);
  const clearError = useAuthStore((s) => s.clearError);
  const error = useAuthStore((s) => s.error);
  const copy = (key: I18nKey) => tWithFallback(key, t, i18n.language);

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
  const [kosmosUrl, setKosmosUrl] = useState("");
  const [kosmosError, setKosmosError] = useState<string | null>(null);
  const [kosmosBusy, setKosmosBusy] = useState(false);

  useEffect(() => {
    void api.installStatus().then(setInstallStatus).catch(() => setInstallStatus(null));
  }, []);

  useEffect(() => {
    if (step !== "kosmos-connect") return;
    const pending = consumeKosmosConnectError();
    if (pending) setKosmosError(pending);
  }, [step]);

  const stepOrder: InstallStep[] =
    modelPath === "cloud"
      ? ["welcome", "model-path", "provider", "account"]
      : modelPath === "kosmos"
        ? ["welcome", "model-path", "kosmos-connect"]
        : ["welcome", "model-path", "account"];
  const stepNumber = stepOrder.indexOf(step) + 1;
  const stepTotal = stepOrder.length;

  const goNextFromModelPath = () => {
    setStep(modelPath === "cloud" ? "provider" : modelPath === "kosmos" ? "kosmos-connect" : "account");
  };

  const connectKosmos = async () => {
    setKosmosBusy(true);
    setKosmosError(null);
    try {
      const origin = normalizeServerUrl(kosmosUrl);
      const test = await testServerConnection(origin);
      if (!test.ok) {
        setKosmosError(test.error);
        return;
      }
      upsertServerProfile({
        name: origin.replace(/^https?:\/\//, ""),
        url: origin,
        kind: "cloud",
      });
      reloadForServerSwitch();
    } catch (err) {
      setKosmosError(err instanceof Error ? err.message : String(err));
    } finally {
      setKosmosBusy(false);
    }
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
            {MODEL_PATH_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`arco-startup-preview__path-card ${modelPath === option.id ? "arco-startup-preview__path-card--active" : ""}`}
                onClick={() => {
                  setModelPath(option.id);
                  setKosmosError(null);
                }}
                aria-pressed={modelPath === option.id}
              >
                <span className="arco-startup-preview__path-label">{copy(option.labelKey)}</span>
                <span className="arco-startup-preview__path-hint">{copy(option.hintKey)}</span>
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

      {step === "kosmos-connect" && (
        <>
          <div className="arco-authscreen__header">
            <div className="arco-authscreen__title">{copy(I18nKey.INSTALL$KOSMOS_CONNECT_TITLE)}</div>
            <div className="arco-authscreen__subtitle">{copy(I18nKey.INSTALL$KOSMOS_CONNECT_SUBTITLE)}</div>
          </div>
          <InstallKosmosConnect
            controlPlaneUrl={deployment.controlPlaneUrl ?? "https://kosmos-control-plane.fly.dev"}
            url={kosmosUrl}
            onUrlChange={setKosmosUrl}
            error={kosmosError}
            busy={kosmosBusy}
            onConnect={() => void connectKosmos()}
          />
          <div className="arco-startup-preview__actions">
            <Button variant="ghost" onClick={() => setStep("model-path")}>
              {i18n.t(I18nKey.COMMON$BACK)}
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
