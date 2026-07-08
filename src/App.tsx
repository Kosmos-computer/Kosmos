/**
 * Root — AuthGate owns boot/login/lock; once the session is ready it mounts
 * the desktop or mobile shell by viewport (the chrome profile).
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BrowserRouter } from "react-router-dom";
import { AuthGate } from "./os/auth/AuthGate";
import { ElectronShell } from "./os/ElectronShell";
import { EmbedAppShell, readEmbedLaunch } from "./os/EmbedAppShell";
import { StandaloneAppWindow } from "./os/StandaloneAppWindow";
import { ShellRoutes } from "./os/ShellRoutes";
import { getStandaloneWindowKey } from "./os/nativeAppWindows";
import { I18nLocaleSync } from "./i18n/I18nLocaleSync";

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
  const { i18n } = useTranslation();
  const standaloneKey = getStandaloneWindowKey();
  const isMobile = useIsMobile();
  const embedLaunch = typeof window !== "undefined" ? readEmbedLaunch() : null;

  if (standaloneKey) {
    return (
      <ElectronShell windowKey={standaloneKey} key={i18n.language}>
        <StandaloneAppWindow windowKey={standaloneKey} />
      </ElectronShell>
    );
  }

  if (embedLaunch) {
    return (
      <ElectronShell key={i18n.language}>
        <I18nLocaleSync />
        <AuthGate>
          <EmbedAppShell />
        </AuthGate>
      </ElectronShell>
    );
  }

  return (
    <ElectronShell key={i18n.language}>
      <I18nLocaleSync />
      <AuthGate>
        <BrowserRouter>
          <ShellRoutes isMobile={isMobile} />
        </BrowserRouter>
      </AuthGate>
    </ElectronShell>
  );
}
