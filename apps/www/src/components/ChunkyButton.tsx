import type { ReactNode } from "react";
import clay from "../styles/clay.module.css";

type ChunkyButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  size?: "default" | "large";
  className?: string;
  external?: boolean;
};

export function ChunkyButton({
  href,
  children,
  variant = "primary",
  size = "default",
  className = "",
  external,
}: ChunkyButtonProps) {
  const classes = [
    clay.chunkyBtn,
    variant === "secondary" ? clay.chunkyBtnSecondary : "",
    size === "large" ? clay.chunkyBtnLarge : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <a
      className={classes}
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
