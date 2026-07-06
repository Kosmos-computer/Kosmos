import { useEffect, useMemo, useState } from "react";
import { Code2, Link2, Palette, Settings2, X } from "lucide-react";
import { Badge, Button, Chip, Input } from "../../components/ui";
import { getWidgetConnections, type BentoConnection } from "./bentoConnections";
import {
  BENTO_DEFAULT_THEME,
  BENTO_THEME_GROUPS,
  getBentoTheme,
  themesByGroup,
  type BentoCardThemeId,
} from "./bentoThemes";
import { useBentoStore } from "./bentoStore";
import type { BentoItem } from "./types";

type SettingsTab = "details" | "connections" | "theme" | "code";

const TAB_OPTIONS: { id: SettingsTab; label: string; icon: typeof Settings2 }[] = [
  { id: "details", label: "Details", icon: Settings2 },
  { id: "connections", label: "Connections", icon: Link2 },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "code", label: "Code", icon: Code2 },
];

function connectionStatusLabel(status: BentoConnection["status"]) {
  switch (status) {
    case "connected":
      return "Connected";
    case "polling":
      return "Polling";
    case "static":
      return "Static";
    case "idle":
      return "Idle";
  }
}

function connectionStatusTone(status: BentoConnection["status"]): "default" | "success" | "warning" {
  switch (status) {
    case "connected":
      return "success";
    case "polling":
      return "default";
    case "static":
      return "default";
    case "idle":
      return "warning";
  }
}

export interface BentoWidgetSettingsModalProps {
  itemId: string | null;
  onClose: () => void;
}

/** Widget inspector — details, connections, theme picker, and JSON editor. */
export function BentoWidgetSettingsModal({ itemId, onClose }: BentoWidgetSettingsModalProps) {
  const item = useBentoStore((s) => s.items.find((entry) => entry.id === itemId) ?? null);
  const updateItem = useBentoStore((s) => s.updateItem);

  const [tab, setTab] = useState<SettingsTab>("details");
  const [draft, setDraft] = useState<BentoItem | null>(null);
  const [codeText, setCodeText] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setDraft({ ...item });
    setCodeText(JSON.stringify(item, null, 2));
    setCodeError(null);
    setTab("details");
  }, [item]);

  const connections = useMemo(() => (draft ? getWidgetConnections(draft) : []), [draft]);

  if (!itemId || !item || !draft) return null;

  function handleSave() {
    if (!draft || !itemId) return;
    updateItem(itemId, draft);
    onClose();
  }

  function handleApplyCode() {
    if (!itemId) return;
    try {
      const parsed = JSON.parse(codeText) as BentoItem;
      if (!parsed.id || !parsed.content?.kind) {
        throw new Error("JSON must include id and content.kind");
      }
      const next: BentoItem = {
        ...parsed,
        id: itemId,
        templateId: parsed.templateId ?? item.templateId,
      };
      setDraft(next);
      setCodeError(null);
      updateItem(itemId, next);
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : "Invalid JSON");
    }
  }

  function patchDraft(patch: Partial<BentoItem>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function patchGrid(field: "col" | "row" | "colSpan" | "rowSpan", value: string) {
    const num = Number.parseInt(value, 10);
    if (!Number.isFinite(num) || num < 1) return;
    patchDraft({ [field]: num });
  }

  return (
    <div className="arco-bento-settings__backdrop" role="presentation" onClick={onClose}>
      <div
        className="arco-bento-settings"
        role="dialog"
        aria-labelledby="bento-settings-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="arco-bento-settings__header">
          <div className="arco-bento-settings__title-row">
            <Settings2 size={18} aria-hidden />
            <div>
              <h2 id="bento-settings-title">{draft.label}</h2>
              <p className="arco-bento-settings__subtitle">
                {draft.content.kind}
                {draft.content.liveKey ? ` · live:${draft.content.liveKey}` : ""}
              </p>
            </div>
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

        <div className="arco-bento-settings__tabs" role="tablist" aria-label="Widget settings sections">
          {TAB_OPTIONS.map((option) => (
            <Chip
              key={option.id}
              active={tab === option.id}
              role="tab"
              aria-selected={tab === option.id}
              onClick={() => setTab(option.id)}
            >
              <option.icon size={13} aria-hidden />
              {option.label}
            </Chip>
          ))}
        </div>

        <div className="arco-bento-settings__body">
          {tab === "details" ? (
            <div className="arco-bento-settings__panel">
              <section className="arco-bento-settings__section">
                <label className="arco-bento-settings__label" htmlFor="bento-settings-label">
                  Widget label
                </label>
                <Input
                  id="bento-settings-label"
                  value={draft.label}
                  onChange={(event) => patchDraft({ label: event.target.value })}
                />
              </section>

              <section className="arco-bento-settings__section">
                <span className="arco-bento-settings__label">Identity</span>
                <dl className="arco-bento-settings__meta-grid">
                  <div>
                    <dt>Instance ID</dt>
                    <dd>{draft.id}</dd>
                  </div>
                  <div>
                    <dt>Template</dt>
                    <dd>{draft.templateId}</dd>
                  </div>
                  <div>
                    <dt>Kind</dt>
                    <dd>{draft.content.kind}</dd>
                  </div>
                  <div>
                    <dt>Theme</dt>
                    <dd>{getBentoTheme(draft.theme).label}</dd>
                  </div>
                </dl>
              </section>

              <section className="arco-bento-settings__section">
                <span className="arco-bento-settings__label">Grid placement</span>
                <div className="arco-bento-settings__grid-fields">
                  {(["col", "row", "colSpan", "rowSpan"] as const).map((field) => (
                    <label key={field} className="arco-bento-settings__grid-field">
                      <span>{field}</span>
                      <Input
                        type="number"
                        min={1}
                        value={String(draft[field])}
                        onChange={(event) => patchGrid(field, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </section>

              {draft.content.kind === "insight" ? (
                <section className="arco-bento-settings__section">
                  <label className="arco-bento-settings__label" htmlFor="bento-settings-title-field">
                    Title
                  </label>
                  <Input
                    id="bento-settings-title-field"
                    value={draft.content.title ?? ""}
                    onChange={(event) =>
                      patchDraft({ content: { ...draft.content, title: event.target.value } })
                    }
                  />
                  <label className="arco-bento-settings__label" htmlFor="bento-settings-description">
                    Description
                  </label>
                  <textarea
                    id="bento-settings-description"
                    className="arco-input arco-bento-settings__textarea"
                    rows={3}
                    value={draft.content.description ?? ""}
                    onChange={(event) =>
                      patchDraft({ content: { ...draft.content, description: event.target.value } })
                    }
                  />
                </section>
              ) : null}
            </div>
          ) : null}

          {tab === "connections" ? (
            <div className="arco-bento-settings__panel">
              <p className="arco-bento-settings__hint">
                Data sources feeding this widget. Toggle polling when APIs are wired.
              </p>
              <ul className="arco-bento-settings__connections">
                {connections.map((connection) => (
                  <li key={connection.id} className="arco-bento-settings__connection">
                    <div className="arco-bento-settings__connection-head">
                      <strong>{connection.label}</strong>
                      <Badge tone={connectionStatusTone(connection.status)}>
                        {connectionStatusLabel(connection.status)}
                      </Badge>
                    </div>
                    <p className="arco-bento-settings__connection-copy">{connection.description}</p>
                    <div className="arco-bento-settings__connection-meta">
                      <span>{connection.type}</span>
                      {connection.endpoint ? <code>{connection.endpoint}</code> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {tab === "theme" ? (
            <div className="arco-bento-settings__panel">
              <p className="arco-bento-settings__hint">
                Card shells ported from UI Experiments — DesignCard, GlassWidget, StatCard, Finance, Banking, and
                Fitness primitives.
              </p>
              {BENTO_THEME_GROUPS.map((group) => {
                const themes = themesByGroup(group.id);
                if (themes.length === 0) return null;
                return (
                  <section key={group.id} className="arco-bento-settings__theme-group">
                    <h3 className="arco-bento-settings__theme-group-title">{group.label}</h3>
                    <div className="arco-bento-settings__theme-grid">
                      {themes.map((theme) => {
                        const selected = (draft.theme ?? BENTO_DEFAULT_THEME) === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            className={[
                              "arco-bento-settings__theme-option",
                              selected && "arco-bento-settings__theme-option--selected",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            data-bento-theme={theme.id}
                            aria-pressed={selected}
                            onClick={() => patchDraft({ theme: theme.id as BentoCardThemeId })}
                          >
                            <span
                              className="arco-bento-settings__theme-swatch"
                              style={{
                                background: `linear-gradient(135deg, ${theme.swatch[0]}, ${theme.swatch[1]})`,
                              }}
                              aria-hidden
                            />
                            <span className="arco-bento-settings__theme-label">{theme.label}</span>
                            <span className="arco-bento-settings__theme-source">{theme.source}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : null}

          {tab === "code" ? (
            <div className="arco-bento-settings__panel">
              <p className="arco-bento-settings__hint">
                Edit the full widget JSON — layout, content, and theme. Instance ID is preserved on apply.
              </p>
              <textarea
                className="arco-input arco-bento-settings__code"
                spellCheck={false}
                value={codeText}
                onChange={(event) => {
                  setCodeText(event.target.value);
                  setCodeError(null);
                }}
              />
              {codeError ? <p className="arco-bento-settings__error">{codeError}</p> : null}
              <div className="arco-bento-settings__code-actions">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCodeText(JSON.stringify(draft, null, 2));
                    setCodeError(null);
                  }}
                >
                  Reset
                </Button>
                <Button variant="primary" onClick={handleApplyCode}>
                  Apply JSON
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="arco-bento-settings__footer">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save changes
          </Button>
        </footer>
      </div>
    </div>
  );
}
