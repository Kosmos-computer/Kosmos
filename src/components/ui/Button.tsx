import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "default" | "primary" | "danger" | "ghost";
export type ButtonSize = "default" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  default: "",
  primary: "arco-btn--primary",
  danger: "arco-btn--danger",
  ghost: "arco-btn--ghost",
};

/** Primary action control — wraps the global `.arco-btn` styles. */
export function Button({
  variant = "default",
  size = "default",
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "arco-btn",
    VARIANT_CLASS[variant],
    size === "icon" ? "arco-btn--icon" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
