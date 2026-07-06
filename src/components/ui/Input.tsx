import type { InputHTMLAttributes } from "react";

export type InputWidth = "full" | "auto" | "narrow" | "compact";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  width?: InputWidth;
}

const WIDTH_CLASS: Record<InputWidth, string> = {
  full: "",
  auto: "arco-input--auto",
  narrow: "arco-input--narrow",
  compact: "arco-input--compact",
};

/** Text field — wraps the global `.arco-input` styles. */
export function Input({ width = "full", className = "", ...rest }: InputProps) {
  const classes = ["arco-input", WIDTH_CLASS[width], className].filter(Boolean).join(" ");
  return <input className={classes} {...rest} />;
}
