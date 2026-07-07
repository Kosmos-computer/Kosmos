/**
 * First-run install wizard — walks a fresh instance from welcome through LLM
 * provider choice to owner account creation. Replaces the bare SetupScreen
 * while needsSetup is true.
 */
import { useEffect, useState, type FormEvent } from "react";
import { ArcoLogo } from "../../components/ArcoLogo";
import { Button, Chip, Input } from "../../components/ui";
import type { InstallStatus, LlmProvider, Settings } from "@shared/types";
import { PROVIDER_PRESETS } from "@shared/types";
import { api } from "../../lib/api";
import { useAuthStore } from "./authStore";
import { AuthWallpaperBackdrop } from "../wallpaper/AuthWallpaperBackdrop";

type InstallStep = "welcome" | "model-path" | "provider" | "account";
type ModelPath = "mock" | "cloud" | "local" | "ollama";

const MODEL_PATHS: { id: ModelPath; label: string; hint: string }[] = [
  { id: "mock", label: "Try offline (mock)", hint: "Scripted demo — no API key" },
  { id: "cloud", label: "Cloud API", hint: "OpenAI, Anthropic, OpenRouter…" },
  { id: "local", label: "Local models", hint: "Arco Models + llama-server" },
  { id: "ollama", label: "Ollama", hint: "Use an existing Ollama install" },
];

const CLOUD_PROVIDERS: { id: Exclude<LlmProvider, "custom" | "mock" | "local" | "ollama">; label: string }[] = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openrouter", label: "OpenRouter" },
];

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
    <div className="arco-install__progress" aria-label={`Step ${step} of ${total}`}>
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
  if (!status || status.ready) return null;
  const failing = status.checks.filter((check) => check.required && !check.ok);
  if (failing.length === 0) return null;

  const packaged = status.packaged === true;

  return (
    <div className="arco-install__checks" role="status">
      <div className="arco-install__checks-title">
        {packaged ? "Installation incomplete" : "Finish setup on this machine"}
      </div>
      <p className="arco-install__checks-lead">
        {packaged ? (
          "This build is missing required components. Download a fresh release or rebuild with npm run dist:desktop."
        ) : (
          <>
            From the repo root, run <code>npm run setup</code>, then refresh.
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
  const setup = useAuthStore((s) => s.setup);
  const clearError = useAuthStore((s) => s.clearError);
  const error = useAuthStore((s) => s.error);

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
      setLocalError("Passwords do not match");
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
            <div className="arco-authscreen__lead">Welcome to Arco</div>
            <div className="arco-authscreen__subtitle">
              Set up models and your owner account — you can change everything later in Settings.
            </div>
          </div>
          <InstallChecks status={installStatus} />
          <Button variant="primary" style={{ justifyContent: "center" }} onClick={() => setStep("model-path")}>
            Get started
          </Button>
        </>
      )}

      {step === "model-path" && (
        <>
          <div className="arco-authscreen__header">
            <div className="arco-authscreen__title">How should Arco run models?</div>
            <div className="arco-authscreen__subtitle">Pick a default for the agent. Mock mode works with no API key.</div>
          </div>
          <div className="arco-startup-preview__path-grid">
            {MODEL_PATHS.map((option) => (
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
              Back
            </Button>
            <Button variant="primary" onClick={goNextFromModelPath}>
              Continue
            </Button>
          </div>
        </>
      )}

      {step === "provider" && (
        <>
          <div className="arco-authscreen__header">
            <div className="arco-authscreen__title">Connect a cloud provider</div>
            <div className="arco-authscreen__subtitle">Keys stay on this machine. You can skip the key and add it in Settings later.</div>
          </div>
          <form
            className="arco-authscreen__form"
            onSubmit={(e) => {
              e.preventDefault();
              setStep("account");
            }}
          >
            <div>
              <label className="arco-label">Provider</label>
              <div className="arco-startup-preview__chips">
                {CLOUD_PROVIDERS.map((entry) => (
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
                API key (optional now)
              </label>
              <Input
                id="install-api-key"
                width="auto"
                type="password"
                placeholder="sk-…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="arco-startup-preview__actions">
              <Button type="button" variant="ghost" onClick={() => setStep("model-path")}>
                Back
              </Button>
              <Button type="submit" variant="primary">
                Continue
              </Button>
            </div>
          </form>
        </>
      )}

      {step === "account" && (
        <>
          <div className="arco-authscreen__header">
            <div className="arco-authscreen__mark" />
            <div className="arco-authscreen__title">Create owner account</div>
            <div className="arco-authscreen__subtitle">Secure this instance — additional users can be added later.</div>
          </div>
          <form className="arco-authscreen__form" onSubmit={(e) => void submitAccount(e)}>
            <div>
              <label className="arco-label" htmlFor="install-username">
                Username
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
                Display name (optional)
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
                Password
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
                Confirm password
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
                Back
              </Button>
              <Button variant="primary" type="submit" disabled={busy}>
                {busy ? "Creating…" : "Finish setup"}
              </Button>
            </div>
          </form>
        </>
      )}
    </InstallCard>
  );
}
