import type { HTMLAttributes, ReactNode } from "react";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title?: ReactNode;
  children?: ReactNode;
}

/** Centered empty / loading / placeholder surface. */
export function EmptyState({ title, className = "", children, ...rest }: EmptyStateProps) {
  const classes = ["arco-empty", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {title ? <strong className="arco-empty__title">{title}</strong> : null}
      {children}
    </div>
  );
}
