import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import type {
  AgentBackend,
  AgentBackendConnectionStatus,
  AgentBackendKind,
  OpenhandsBackendVariant,
} from "@shared/types";
import { api } from "../lib/api";
import { Button, Chip, Input } from "../components/ui";

const KIND_OPTIONS: { id: AgentBackendKind; label: string; hint: string }[] = [
  {
    id: "openhands",
    label: "OpenHands",
    hint: "Local Agent Server or OpenHands Cloud",
  },
  {
    id: "kosmos",
    label: "Kosmos",
    hint: "Remote kosmos server with a bearer token",
  },
];

const KIND_COPY: Record<
  AgentBackendKind,
  { keyPlaceholder: string; connectedLabel: string; hostPlaceholder: string }
> = {
  openhands: {
    hostPlaceholder: "http://localhost:3000",
    keyPlaceholder: "Session API key",
    connectedLabel: "Connected — OpenHands Agent Server",
  },
  kosmos: {
    hostPlaceholder: "https://kosmos.example.com",
    keyPlaceholder: "Bearer token",
    connectedLabel: "Connected to remote kosmos",
  },
};

export interface AddAgentBackendWizardProps {
  open: boolean;
  onClose: () => void;
  onAdded: (backend: AgentBackend, activeId: string | null) => void;
}

export function AddAgentBackendWizard({ open, onClose, onAdded }: AddAgentBackendWizardProps) {
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

  return (
    <div className="arco-connect-modal__backdrop" role="presentation" onClick={onClose}>
      <div
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
          {step === "type" ? (
            <section className="arco-connect-modal__section">
              <h3 className="arco-connect-modal__label">Backend type</h3>
              <div className="arco-connect-modal__provider-grid">
                {KIND_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`arco-connect-modal__provider${kind === option.id ? " arco-connect-modal__provider--active" : ""}`}
                    onClick={() => setKind(option.id)}
                  >
                    <span className="arco-connect-modal__provider-label">{option.label}</span>
                    <span className="arco-connect-modal__provider-hint">{option.hint}</span>
                  </button>
                ))}
              </div>
              <footer className="arco-menubar-backends__wizard-actions">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setStep("details")}>
                  Continue
                </Button>
              </footer>
            </section>
          ) : (
            <section className="arco-connect-modal__section">
              <h3 className="arco-connect-modal__label">Connection details</h3>
              <div className="arco-menubar-backends__wizard-fields">
                <Input
                  id="add-backend-name"
                  width="auto"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  id="add-backend-host"
                  width="auto"
                  placeholder={copy.hostPlaceholder}
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
                <Input
                  id="add-backend-key"
                  width="auto"
                  type="password"
                  placeholder={copy.keyPlaceholder}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                {kind === "openhands" ? (
                  <div className="arco-settings-chip-row">
                    {(["local", "cloud"] as const).map((value) => (
                      <Chip key={value} active={variant === value} onClick={() => setVariant(value)}>
                        {value}
                      </Chip>
                    ))}
                  </div>
                ) : null}
              </div>

              {status?.connected ? (
                <p className="arco-menubar-backends__wizard-success">
                  {copy.connectedLabel}
                  {status.version ? ` ${status.version}` : ""}
                </p>
              ) : null}
              {status && !status.connected && status.error ? (
                <p className="arco-menubar-backends__wizard-error">{status.error}</p>
              ) : null}
              {error ? <p className="arco-menubar-backends__wizard-error">{error}</p> : null}

              <footer className="arco-menubar-backends__wizard-actions">
                <Button variant="ghost" onClick={() => setStep("type")}>
                  Back
                </Button>
                <Button variant="default" disabled={testing || !host.trim()} onClick={() => void testConnection()}>
                  {testing ? "Testing…" : "Test connection"}
                </Button>
                <Button
                  variant="primary"
                  disabled={saving || !host.trim()}
                  onClick={() => void saveBackend()}
                >
                  {saving ? "Adding…" : "Add backend"}
                </Button>
              </footer>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
