/**
 * Root — AuthGate owns boot/login/lock; once the session is ready it mounts
 * the desktop or mobile shell by viewport (the chrome profile).
 */
import { useEffect, useState } from "react";
import { AuthGate } from "./os/auth/AuthGate";
import { Desktop } from "./os/Desktop";
import { MobileShell } from "./os/MobileShell";
import { StandaloneAppWindow } from "./os/StandaloneAppWindow";
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

  if (standaloneKey) {
    return <StandaloneAppWindow windowKey={standaloneKey} />;
  }

  return (
    <AuthGate>
      {isMobile ? <MobileShell /> : <Desktop />}
    </AuthGate>
  );
}
