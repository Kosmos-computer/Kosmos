import type { HTMLAttributes, ReactNode } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "default" | "success" | "warning" | "danger";
  children: ReactNode;
}

/** Status pill — compact label for counts and states. */
export function Badge({ tone = "default", className = "", children, ...rest }: BadgeProps) {
  const classes = ["arco-badge", tone !== "default" ? `arco-badge--${tone}` : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
