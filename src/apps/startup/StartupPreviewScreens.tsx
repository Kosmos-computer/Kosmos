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
        <div className="arco-authscreen__lead">Welcome to Arco</div>
        <div className="arco-authscreen__subtitle">
          Set up your workspace, models, and account in a few steps.
        </div>
      </div>
      <Button variant="primary" style={{ justifyContent: "center" }}>
        Get started
      </Button>
    </PreviewCard>
  );
}

export function StoragePreview() {
  const [path, setPath] = useState("~/Library/Application Support/Arco");

  return (
    <PreviewCard>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__title">Choose data location</div>
        <div className="arco-authscreen__subtitle">
          Settings, chat history, and model files live here. Pick a drive with enough free space.
        </div>
      </div>
      <form
        className="arco-authscreen__form"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
        }}
      >
        <div>
          <label className="arco-label" htmlFor="startup-storage-path">
            Data folder
          </label>
          <Input
            id="startup-storage-path"
            width="auto"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
        </div>
        <p className="arco-startup-preview__hint">Requires about 12 GB free for a starter local model.</p>
        <Button variant="primary" type="submit" style={{ justifyContent: "center" }}>
          Continue
        </Button>
      </form>
    </PreviewCard>
  );
}

export function DockerPreview() {
  const [enabled, setEnabled] = useState(false);

  return (
    <PreviewCard>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__title">Docker (optional)</div>
        <div className="arco-authscreen__subtitle">
          Enable containerized tools and sandboxed automations. You can turn this on later in Settings.
        </div>
      </div>
      <div className="arco-startup-preview__toggle-row">
        <div>
          <div className="arco-startup-preview__toggle-label">Use Docker when available</div>
          <div className="arco-startup-preview__toggle-hint">Requires Docker Desktop or a compatible runtime.</div>
        </div>
        <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} aria-label="Enable Docker" />
      </div>
      <div className="arco-startup-preview__actions">
        <Button variant="ghost">Skip for now</Button>
        <Button variant="primary">Continue</Button>
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
        <div className="arco-authscreen__title">How should Arco run models?</div>
        <div className="arco-authscreen__subtitle">You can add more providers after setup.</div>
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
      <Button variant="primary" style={{ justifyContent: "center" }}>
        Continue
      </Button>
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
        <div className="arco-authscreen__title">Pick a starter model</div>
        <div className="arco-authscreen__subtitle">
          Download happens in the background. Tool-calling models work best with Arco&apos;s agent.
        </div>
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
        <span className="arco-startup-preview__progress-label">Preview — download not started</span>
      </div>
      <Button variant="primary" style={{ justifyContent: "center" }}>
        Download and continue
      </Button>
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
        <div className="arco-authscreen__title">Connect a provider</div>
        <div className="arco-authscreen__subtitle">Keys are stored on this machine and shown masked in Settings.</div>
      </div>
      <form
        className="arco-authscreen__form"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
        }}
      >
        <div>
          <label className="arco-label">Provider</label>
          <div className="arco-startup-preview__chips">
            {PROVIDERS.map((entry) => (
              <Chip key={entry.id} active={provider === entry.id} onClick={() => setProvider(entry.id)}>
                {entry.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <label className="arco-label" htmlFor="startup-provider-key">
            API key
          </label>
          <Input id="startup-provider-key" width="auto" type="password" placeholder="sk-…" />
        </div>
        <Button variant="primary" type="submit" style={{ justifyContent: "center" }}>
          Save and continue
        </Button>
      </form>
    </PreviewCard>
  );
}

export function UserPreview() {
  return (
    <PreviewCard>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__mark" />
        <div className="arco-authscreen__title">Create owner account</div>
        <div className="arco-authscreen__subtitle">Secure this instance — additional users can be invited later.</div>
      </div>
      <form
        className="arco-authscreen__form"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
        }}
      >
        <div>
          <label className="arco-label" htmlFor="startup-user-name">
            Username
          </label>
          <Input id="startup-user-name" width="auto" defaultValue="owner" />
        </div>
        <div>
          <label className="arco-label" htmlFor="startup-user-display">
            Display name (optional)
          </label>
          <Input id="startup-user-display" width="auto" placeholder="Alex" />
        </div>
        <div>
          <label className="arco-label" htmlFor="startup-user-password">
            Password
          </label>
          <Input id="startup-user-password" width="auto" type="password" autoComplete="new-password" />
        </div>
        <Button variant="primary" type="submit" style={{ justifyContent: "center" }}>
          Create account
        </Button>
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
