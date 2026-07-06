/** Top chrome: brand + agent status dot, focused window title, shell view toggle, clock, theme toggle, lock. */
import { useEffect, useState } from "react";
import { AppWindow, Lock, Monitor, Moon, Sun } from "lucide-react";
import { useAuthStore } from "./auth/authStore";
import { useOsStore } from "./osStore";
import { useWindowStore } from "./windowStore";

function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return now.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MenuBar() {
  const { theme, setTheme, agentBusy, shellView, setShellView } = useOsStore();
  const user = useAuthStore((s) => s.user);
  const lock = useAuthStore((s) => s.lock);
  const windows = useWindowStore((s) => s.windows);
  const clock = useClock();

  const focused = windows
    .filter((w) => !w.minimized)
    .sort((a, b) => b.z - a.z)[0];

  return (
    <header className="arco-menubar">
      <span className="arco-menubar__brand">
        <span
          className={`arco-menubar__brand-dot ${agentBusy ? "arco-menubar__brand-dot--busy" : ""}`}
          title={agentBusy ? "Agent working" : "Agent idle"}
        />
        Arco OS
      </span>
      <span className="arco-menubar__title">{focused?.title ?? ""}</span>
      <div className="arco-menubar__right">
        <div
          className="arco-menubar__view-toggle"
          role="group"
          aria-label="Shell view"
        >
          <button
            type="button"
            className={`arco-menubar__view-toggle-btn${shellView === "desktop" ? " arco-menubar__view-toggle-btn--active" : ""}`}
            onClick={() => setShellView("desktop")}
            aria-label="Desktop view"
            aria-pressed={shellView === "desktop"}
            title="Desktop view"
          >
            <Monitor size={14} />
          </button>
          <button
            type="button"
            className={`arco-menubar__view-toggle-btn${shellView === "app" ? " arco-menubar__view-toggle-btn--active" : ""}`}
            onClick={() => setShellView("app")}
            aria-label="App view"
            aria-pressed={shellView === "app"}
            title="App view"
          >
            <AppWindow size={14} />
          </button>
        </div>
        {user && <span title={`Signed in as ${user.username} (${user.role})`}>{user.displayName}</span>}
        <button
          className="arco-menubar__icon-btn"
          onClick={() => void lock()}
          aria-label="Lock Arco"
          title="Lock"
        >
          <Lock size={14} />
        </button>
        <button
          className="arco-menubar__icon-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <span>{clock}</span>
      </div>
    </header>
  );
}
