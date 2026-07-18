import type { ReactNode } from "react";
import type { StagedPhase } from "./useStagedList";

/** Height-collapsing wrapper that plays enter/exit motion for Drive rows and cards. */
export function DriveMotionSlot({
  phase,
  flash,
  variant,
  children,
}: {
  phase: StagedPhase;
  flash?: boolean;
  variant: "row" | "card";
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "arco-drive-motion",
        `arco-drive-motion--${variant}`,
        phase === "enter" ? "arco-drive-motion--enter" : "",
        phase === "exit" ? "arco-drive-motion--exit" : "",
        flash ? "arco-drive-motion--flash" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="arco-drive-motion__inner">{children}</div>
    </div>
  );
}
