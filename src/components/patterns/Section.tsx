import type { ReactNode } from "react";

export interface SectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Settings and form section — title, optional description, stacked fields. */
export function Section({ title, description, children, className = "" }: SectionProps) {
  const classes = ["arco-form", "arco-section", className].filter(Boolean).join(" ");
  return (
    <section className={classes}>
      <strong className="arco-section__title">{title}</strong>
      {description ? <span className="arco-section__desc">{description}</span> : null}
      {children}
    </section>
  );
}

export interface FormActionsProps {
  children: ReactNode;
  saved?: boolean;
}

/** Save row with optional saved confirmation. */
export function FormActions({ children, saved }: FormActionsProps) {
  return (
    <div className="arco-section__actions">
      {children}
      {saved ? <span className="arco-section__saved">Saved</span> : null}
    </div>
  );
}

export interface FormRowProps {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Horizontal flex row for list items, tool rows, and provider pickers. */
export function FormRow({ children, disabled, className = "" }: FormRowProps) {
  const classes = ["arco-row", disabled ? "arco-row--disabled" : "", className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}
