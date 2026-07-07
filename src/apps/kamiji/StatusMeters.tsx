import type { PetStats } from "./types";

interface StatusMetersProps {
  stats: PetStats;
}

const meters = [
  { key: "hunger" as const, label: "Hunger", icon: "🍙", color: "var(--kamiji-meter-hunger)" },
  { key: "happiness" as const, label: "Happy", icon: "♥", color: "var(--kamiji-meter-happy)" },
  { key: "energy" as const, label: "Energy", icon: "⚡", color: "var(--kamiji-meter-energy)" },
  { key: "cleanliness" as const, label: "Clean", icon: "✦", color: "var(--kamiji-meter-clean)" },
  { key: "health" as const, label: "Health", icon: "✚", color: "var(--kamiji-meter-health)" },
];

export function StatusMeters({ stats }: StatusMetersProps) {
  return (
    <div className="arco-kamiji-meters">
      {meters.map(({ key, label, icon, color }) => (
        <div key={key} className="arco-kamiji-meters__row">
          <span className="arco-kamiji-meters__icon" aria-hidden="true">{icon}</span>
          <span className="arco-kamiji-meters__label">{label}</span>
          <div className="arco-kamiji-meters__bar">
            <div
              className="arco-kamiji-meters__fill"
              style={{
                width: `${Math.round(stats[key])}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className="arco-kamiji-meters__value">{Math.round(stats[key])}</span>
        </div>
      ))}
    </div>
  );
}
