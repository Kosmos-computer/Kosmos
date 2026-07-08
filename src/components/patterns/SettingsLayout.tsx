import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
import type { ReactNode } from "react";

/** Max-width content column for a settings detail pane. */
export function SettingsPage({ children }: { children: ReactNode }) {
  return <div className="arco-settings-page">{children}</div>;
}

export interface SettingsSectionProps {
  intro?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Settings detail section — intro + stacked rows (title lives in the shell header). */
export function SettingsSection({ intro, children, className = "" }: SettingsSectionProps) {
  return (
    <section className={["arco-settings-section", className].filter(Boolean).join(" ")}>
      {intro ? <p className="arco-settings-intro">{intro}</p> : null}
      {children}
    </section>
  );
}

export function SettingsDivider() {
  return <hr className="arco-settings-divider" role="separator" />;
}

export function SettingsSubhead({ children }: { children: ReactNode }) {
  return <h2 className="arco-settings-subhead">{children}</h2>;
}

export function SettingsGroupLabel({ children }: { children: ReactNode }) {
  return <div className="arco-settings-group-label">{children}</div>;
}

/** Rows separated by hairline dividers (Longformer field/toggle rows). */
export function SettingsStack({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={["arco-settings-stack", className].filter(Boolean).join(" ")}>{children}</div>;
}

export interface SettingsRowProps {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SettingsRow({ children, disabled, className = "" }: SettingsRowProps) {
  const classes = ["arco-settings-row", disabled ? "arco-settings-row--disabled" : "", className]
    .filter(Boolean)
    .join(" ");
  return <div className={classes}>{children}</div>;
}

export interface SettingsFieldRowProps {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  alignTop?: boolean;
}

/** Label column + control column (Discord/Longformer settings field layout). */
export function SettingsFieldRow({ label, hint, children, htmlFor, alignTop }: SettingsFieldRowProps) {
  return (
    <SettingsRow className={alignTop ? "arco-settings-row--align-top" : ""}>
      <div className="arco-settings-row__label">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : label}
        {hint ? <span className="arco-settings-row__hint">{hint}</span> : null}
      </div>
      <div className="arco-settings-row__control">{children}</div>
    </SettingsRow>
  );
}

export function SettingsRowMeta({ children }: { children: ReactNode }) {
  return <span className="arco-settings-row__meta">{children}</span>;
}

export function SettingsRowActions({ children }: { children: ReactNode }) {
  return <div className="arco-settings-row__actions">{children}</div>;
}

export function SettingsChipRow({ children }: { children: ReactNode }) {
  return <div className="arco-settings-chip-row">{children}</div>;
}

export function SettingsPanel({
  children,
  disabled,
  className = "",
}: {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const classes = ["arco-settings-panel", disabled ? "arco-settings-panel--disabled" : "", className]
    .filter(Boolean)
    .join(" ");
  return <div className={classes}>{children}</div>;
}

export function SettingsPanelHeader({ children }: { children: ReactNode }) {
  return <div className="arco-settings-panel__header">{children}</div>;
}

export function SettingsPanelBody({ children }: { children: ReactNode }) {
  return <div className="arco-settings-panel__body">{children}</div>;
}

export type SettingsAlertTone = "error" | "success" | "muted";

export function SettingsAlert({
  tone = "error",
  children,
}: {
  tone?: SettingsAlertTone;
  children: ReactNode;
}) {
  return (
    <p className={["arco-settings-alert", `arco-settings-alert--${tone}`].filter(Boolean).join(" ")}>
      {children}
    </p>
  );
}

export function SettingsSaveBar({ children, saved }: { children: ReactNode; saved?: boolean }) {
  return (
    <div className="arco-settings-save-bar">
      {children}
      {saved ? <span className="arco-settings-save-bar__saved"><T k={I18nKey.COMPONENTS$PATTERNS_SAVED} /></span> : null}
    </div>
  );
}

export function SettingsEmpty({ children }: { children: ReactNode }) {
  return <p className="arco-settings-empty">{children}</p>;
}

export function SettingsLog({ children }: { children: ReactNode }) {
  return <pre className="arco-settings-log">{children}</pre>;
}

export function SettingsStatusDot({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span
      className="arco-settings-status-dot"
      style={{ background: color }}
      aria-label={label}
    />
  );
}
