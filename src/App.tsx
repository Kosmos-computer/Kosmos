/**
 * Root — AuthGate owns boot/login/lock; once the session is ready it mounts
 * the desktop or mobile shell by viewport (the chrome profile).
 */
import { useEffect, useState } from "react";
import { AuthGate } from "./os/auth/AuthGate";
import { Desktop } from "./os/Desktop";
import { ElectronShell } from "./os/ElectronShell";
import { EmbedAppShell, readEmbedLaunch } from "./os/EmbedAppShell";
import { MobileShell } from "./os/MobileShell";
import { StandaloneAppWindow } from "./os/StandaloneAppWindow";
import { CommandPalette } from "./os/CommandPalette";
import { getStandaloneWindowKey } from "./os/nativeAppWindows";

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

export default function App() {
  const standaloneKey = getStandaloneWindowKey();
  const isMobile = useIsMobile();
  const embedLaunch = typeof window !== "undefined" ? readEmbedLaunch() : null;

  if (standaloneKey) {
    return (
      <ElectronShell windowKey={standaloneKey}>
        <StandaloneAppWindow windowKey={standaloneKey} />
      </ElectronShell>
    );
  }

  if (embedLaunch) {
    return (
      <ElectronShell>
        <AuthGate>
          <EmbedAppShell />
        </AuthGate>
      </ElectronShell>
    );
  }

  return (
    <ElectronShell>
      <AuthGate>
        {isMobile ? <MobileShell /> : <Desktop />}
        <CommandPalette />
      </AuthGate>
    </ElectronShell>
  );
}
