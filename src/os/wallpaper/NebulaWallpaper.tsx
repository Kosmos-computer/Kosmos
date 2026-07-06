/**
 * Soft spinning color orbs — inspired by SpaceRadio's EnergyBackground.
 * Uses Arco accent hues so the effect feels native to the shell palette.
 */
import type { CSSProperties } from "react";
import type { Theme } from "../osStore";

const ORBS_DARK = [
  { clr: "#6ea8fe", i: "18px", d: "2.5s" },
  { clr: "#8b5cf6", i: "13px", d: "5s" },
  { clr: "#38bdf8", i: "15px", d: "7.5s" },
  { clr: "#34d399", i: "20px", d: "2.5s" },
] as const;

const ORBS_LIGHT = [
  { clr: "#5b82ff", i: "18px", d: "2.5s" },
  { clr: "#7c3aed", i: "13px", d: "5s" },
  { clr: "#0ea5e9", i: "15px", d: "7.5s" },
  { clr: "#10b981", i: "20px", d: "2.5s" },
] as const;

export function NebulaWallpaper({ theme }: { theme: Theme }) {
  const orbs = theme === "light" ? ORBS_LIGHT : ORBS_DARK;

  return (
    <div className="arco-wallpaper__effect arco-wallpaper__effect--nebula" aria-hidden>
      <div className="arco-wallpaper-nebula">
        {orbs.map((orb) => (
          <span
            key={orb.clr}
            style={
              {
                "--clr": orb.clr,
                "--i": orb.i,
                "--d": orb.d,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
