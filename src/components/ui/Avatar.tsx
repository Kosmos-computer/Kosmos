export type AvatarSize = "sm" | "md";

export interface AvatarProps {
  name: string;
  size?: AvatarSize;
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

/** Compact avatar with optional online status dot. */
export function Avatar({ name, size = "md", status, className = "" }: AvatarProps) {
  const classes = [
    "arco-avatar",
    size === "sm" ? "arco-avatar--sm" : "arco-avatar--md",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes} role="img" aria-label={name}>
      {initials(name)}
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
