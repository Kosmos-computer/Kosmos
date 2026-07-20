import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Cloud, Plus, Server, X } from "lucide-react";
import type {
  AgentBackend,
  AgentBackendConnectionStatus,
  AgentBackendKind,
  OpenhandsBackendVariant,
} from "@shared/types";
import { api } from "../lib/api";
import { useDismiss } from "../components/useDismiss";
import { Button, Chip, Input } from "../components/ui";

const KIND_OPTIONS: {
  id: AgentBackendKind;
  label: string;
  hint: string;
  icon: typeof Server;
}[] = [
  {
    id: "openhands",
    label: "OpenHands",
    hint: "Local Agent Server or OpenHands Cloud",
    icon: Server,
  },
  {
    id: "kosmos",
    label: "Kosmos",
    hint: "Remote Kosmos server with a bearer token",
    icon: Cloud,
  },
];

const KIND_COPY: Record<
  AgentBackendKind,
  {
    keyLabel: string;
    keyPlaceholder: string;
    connectedLabel: string;
    hostPlaceholder: string;
    hostHint: string;
  }
> = {
  openhands: {
    hostPlaceholder: "http://localhost:3000",
    hostHint: "Agent Server URL or OpenHands Cloud host.",
    keyLabel: "API key",
    keyPlaceholder: "Session API key",
    connectedLabel: "Connected — OpenHands Agent Server",
  },
  kosmos: {
    hostPlaceholder: "https://kosmos.example.com",
    hostHint: "Remote Kosmos host. Mint a token under Settings → External Access.",
    keyLabel: "Bearer token",
    keyPlaceholder: "Bearer token",
    connectedLabel: "Connected to remote Kosmos",
  },
};

export interface AddAgentBackendWizardProps {
  open: boolean;
  onClose: () => void;
  onAdded: (backend: AgentBackend, activeId: string | null) => void;
}

export function AddAgentBackendWizard({ open, onClose, onAdded }: AddAgentBackendWizardProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<"type" | "details">("type");
  const [kind, setKind] = useState<AgentBackendKind>("openhands");
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [variant, setVariant] = useState<OpenhandsBackendVariant>("local");
  const [status, setStatus] = useState<AgentBackendConnectionStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useDismiss(open, onClose, dialogRef);

  useEffect(() => {
    if (!open) return;
    setStep("type");
    setKind("openhands");
    setName("");
    setHost("");
    setApiKey("");
    setVariant("local");
    setStatus(null);
    setTesting(false);
    setSaving(false);
    setError(null);
  }, [open]);

  if (!open) return null;

  const copy = KIND_COPY[kind];
  const selectedKind = KIND_OPTIONS.find((option) => option.id === kind);

  async function testConnection() {
    setTesting(true);
    setError(null);
    try {
      setStatus(await api.testAgentBackend(kind, host, apiKey));
    } catch (err) {
      setStatus({
        connected: false,
        error: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  }

  async function saveBackend() {
    setSaving(true);
    setError(null);
    try {
      const result = await api.addAgentBackend({
        name,
        host,
        apiKey,
        kind,
        ...(kind === "openhands" ? { variant } : {}),
      });
      onAdded(result.backend, result.activeId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add backend");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="arco-connect-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="arco-connect-modal arco-connect-modal--wizard"
        role="dialog"
        aria-labelledby="add-backend-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="arco-connect-modal__header">
          <div className="arco-connect-modal__title-row">
            <Plus size={18} aria-hidden />
            <h2 id="add-backend-title">Add agent backend</h2>
          </div>
          <button
            type="button"
            className="arco-btn arco-btn--ghost arco-btn--icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        <div className="arco-connect-modal__body">
          <p className="arco-connect-modal__step">
            Step {step === "type" ? "1" : "2"} of 2
            {step === "details" && selectedKind ? ` · ${selectedKind.label}` : ""}
          </p>

          {step === "type" ? (
            <section className="arco-connect-modal__section">
              <h3 className="arco-connect-modal__label">Backend type</h3>
              <div className="arco-connect-modal__option-list" role="listbox" aria-label="Backend type">
                {KIND_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = kind === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`arco-connect-modal__option${active ? " arco-connect-modal__option--active" : ""}`}
                      onClick={() => setKind(option.id)}
                    >
                      <span className="arco-connect-modal__option-icon" aria-hidden>
                        <Icon size={18} />
                      </span>
                      <span className="arco-connect-modal__option-copy">
                        <span className="arco-connect-modal__option-label">{option.label}</span>
                        <span className="arco-connect-modal__option-hint">{option.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <>
              <section className="arco-connect-modal__section">
                <label className="arco-connect-modal__label" htmlFor="add-backend-name">
                  Name
                </label>
                <Input
                  id="add-backend-name"
                  placeholder="My OpenHands server"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </section>

              <section className="arco-connect-modal__section">
                <label className="arco-connect-modal__label" htmlFor="add-backend-host">
                  Host
                </label>
                <Input
                  id="add-backend-host"
                  placeholder={copy.hostPlaceholder}
                  value={host}
                  spellCheck={false}
                  onChange={(e) => setHost(e.target.value)}
                />
                <p className="arco-connect-modal__hint">{copy.hostHint}</p>
              </section>

              <section className="arco-connect-modal__section">
                <label className="arco-connect-modal__label" htmlFor="add-backend-key">
                  {copy.keyLabel}
                </label>
                <Input
                  id="add-backend-key"
                  type="password"
                  placeholder={copy.keyPlaceholder}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </section>

              {kind === "openhands" ? (
                <section className="arco-connect-modal__section">
                  <h3 className="arco-connect-modal__label">Variant</h3>
                  <div className="arco-connect-modal__chips" role="listbox" aria-label="OpenHands variant">
                    {([
                      { id: "local" as const, label: "Local" },
                      { id: "cloud" as const, label: "Cloud" },
                    ]).map((option) => (
                      <Chip
                        key={option.id}
                        role="option"
                        aria-selected={variant === option.id}
                        active={variant === option.id}
                        className={variant === option.id ? "arco-connect-modal__chip--selected" : ""}
                        onClick={() => setVariant(option.id)}
                      >
                        {option.label}
                      </Chip>
                    ))}
                  </div>
                </section>
              ) : null}

              {status?.connected ? (
                <p className="arco-connect-modal__success">
                  {copy.connectedLabel}
                  {status.version ? ` ${status.version}` : ""}
                </p>
              ) : null}
              {status && !status.connected && status.error ? (
                <p className="arco-connect-modal__error">{status.error}</p>
              ) : null}
              {error ? <p className="arco-connect-modal__error">{error}</p> : null}
            </>
          )}
        </div>

        <footer className="arco-connect-modal__footer">
          {step === "type" ? (
            <>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setStep("details")}>
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep("type")}>
                Back
              </Button>
              <Button variant="default" disabled={testing || !host.trim()} onClick={() => void testConnection()}>
                {testing ? "Testing…" : "Test connection"}
              </Button>
              <Button variant="primary" disabled={saving || !host.trim()} onClick={() => void saveBackend()}>
                {saving ? "Adding…" : "Add backend"}
              </Button>
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
