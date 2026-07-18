import { useLayoutEffect, useState, type ReactNode } from "react";
import type { StagedPhase } from "./useStagedList";

/**
 * Height accordion for Drive list/grid mutations.
 * Enter mounts collapsed (0fr) then opens on the next frame; exit collapses to 0fr.
 */
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
  const [expanded, setExpanded] = useState(phase === "shown");

  useLayoutEffect(() => {
    if (phase === "exit") {
      setExpanded(false);
      return;
    }
    if (phase === "shown") {
      setExpanded(true);
      return;
    }

    // Enter: paint collapsed first, then open so grid-template-rows can transition.
    setExpanded(false);
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => setExpanded(true));
    });
    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
    };
  }, [phase]);

  return (
    <div
      className={[
        "arco-drive-motion",
        `arco-drive-motion--${variant}`,
        expanded ? "arco-drive-motion--open" : "arco-drive-motion--collapsed",
        flash ? "arco-drive-motion--flash" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={phase === "exit" ? true : undefined}
    >
      <div className="arco-drive-motion__inner">{children}</div>
    </div>
  );
}
