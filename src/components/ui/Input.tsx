import { forwardRef, type InputHTMLAttributes } from "react";

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
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { width = "full", className = "", ...rest },
  ref,
) {
  const classes = ["arco-input", WIDTH_CLASS[width], className].filter(Boolean).join(" ");
  return <input ref={ref} className={classes} {...rest} />;
});
