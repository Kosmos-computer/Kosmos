export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
  name: string;
  size?: AvatarSize;
  /** Optional image URL — falls back to initials when missing or broken. */
  src?: string;
  status?: "online" | "offline";
  className?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Compact avatar with optional image, initials fallback, and online status. */
export function Avatar({ name, size = "md", src, status, className = "" }: AvatarProps) {
  const classes = [
    "arco-avatar",
    size === "sm" ? "arco-avatar--sm" : size === "lg" ? "arco-avatar--lg" : "arco-avatar--md",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes} role="img" aria-label={name}>
      {src ? (
        <img className="arco-avatar__image" src={src} alt="" loading="lazy" decoding="async" />
      ) : (
        initials(name)
      )}
      {status ? (
        <span
          className={[
            "arco-avatar__status",
            status === "online" ? "arco-avatar__status--online" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}
