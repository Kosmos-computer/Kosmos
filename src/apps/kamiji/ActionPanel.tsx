import type { PetAction } from "./types";

interface ActionPanelProps {
  isSleeping: boolean;
  isDead: boolean;
  poopCount: number;
  isSick: boolean;
  onAction: (action: PetAction) => void;
}

const actions: { action: PetAction; label: string; icon: string }[] = [
  { action: "feed", label: "Feed", icon: "🍚" },
  { action: "play", label: "Play", icon: "🎾" },
  { action: "clean", label: "Clean", icon: "🧹" },
  { action: "medicine", label: "Med", icon: "💊" },
];

export function ActionPanel({
  isSleeping,
  isDead,
  poopCount,
  isSick,
  onAction,
}: ActionPanelProps) {
  const handleSleepWake = () => {
    onAction(isSleeping ? "wake" : "sleep");
  };

  return (
    <div className="arco-kamiji-actions">
      {actions.map(({ action, label, icon }) => (
        <button
          key={action}
          type="button"
          className="arco-kamiji-actions__btn"
          onClick={() => onAction(action)}
          disabled={isDead || (isSleeping && action !== "clean")}
          title={label}
        >
          <span className="arco-kamiji-actions__icon">{icon}</span>
          <span className="arco-kamiji-actions__label">{label}</span>
          {action === "clean" && poopCount > 0 && (
            <span className="arco-kamiji-actions__badge">{poopCount}</span>
          )}
          {action === "medicine" && isSick && (
            <span className="arco-kamiji-actions__badge arco-kamiji-actions__badge--alert">!</span>
          )}
        </button>
      ))}
      <button
        type="button"
        className="arco-kamiji-actions__btn arco-kamiji-actions__btn--sleep"
        onClick={handleSleepWake}
        disabled={isDead}
        title={isSleeping ? "Wake" : "Sleep"}
      >
        <span className="arco-kamiji-actions__icon">{isSleeping ? "☀️" : "🌙"}</span>
        <span className="arco-kamiji-actions__label">{isSleeping ? "Wake" : "Sleep"}</span>
      </button>
    </div>
  );
}
