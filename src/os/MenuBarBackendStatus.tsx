import { Server } from "lucide-react";
import { backendStatusLabel, useBackendStatus } from "./useBackendStatus";

export function MenuBarBackendStatus() {
  const status = useBackendStatus();
  const label = backendStatusLabel(status);

  return (
    <button
      type="button"
      className="arco-menubar__icon-btn arco-menubar__server-btn"
      aria-label={label}
      title={label}
    >
      <Server size={14} />
      <span
        className={[
          "arco-menubar__status-dot",
          status === "online" && "arco-menubar__status-dot--online",
          status === "offline" && "arco-menubar__status-dot--offline",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      />
    </button>
  );
}
