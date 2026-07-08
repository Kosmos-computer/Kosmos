import type { AgentAvatarConfig } from "./types";

export interface AgentAvatarProps {
  avatar: AgentAvatarConfig;
  name: string;
  size?: "sm" | "md" | "lg";
  status?: "active" | "idle" | "running" | "offline";
  className?: string;
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Agent persona avatar — emoji, initials, or face-rig with optional status ring. */
export function AgentAvatar({ avatar, name, size = "md", status, className = "" }: AgentAvatarProps) {
  const classes = [
    "arco-agent-avatar",
    `arco-agent-avatar--${size}`,
    avatar.color ? `arco-agent-avatar--${avatar.color}` : "",
    status ? `arco-agent-avatar--${status}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const glyph =
    avatar.kind === "emoji"
      ? avatar.value
      : avatar.kind === "initials"
        ? initials(avatar.value || name)
        : "◎";

  return (
    <span className={classes} role="img" aria-label={name}>
      <span className="arco-agent-avatar__glyph" aria-hidden="true">
        {glyph}
      </span>
      {status ? <span className="arco-agent-avatar__status" aria-hidden="true" /> : null}
    </span>
  );
}
