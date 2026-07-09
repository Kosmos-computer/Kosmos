/**
 * Root — AuthGate owns boot/login/lock; once the session is ready it mounts
 * the desktop or mobile shell by platform profile (native) or viewport (web).
 */
import { useTranslation } from "react-i18next";
import { BrowserRouter } from "react-router-dom";
import { AuthGate } from "./os/auth/AuthGate";
import { ServerConnectGate } from "./os/server/ServerConnectGate";
import { ElectronShell } from "./os/ElectronShell";
import { EmbedAppShell, readEmbedLaunch } from "./os/EmbedAppShell";
import { StandaloneAppWindow } from "./os/StandaloneAppWindow";
import { ShellRoutes } from "./os/ShellRoutes";
import { getStandaloneWindowKey } from "./os/nativeAppWindows";
import { I18nLocaleSync } from "./i18n/I18nLocaleSync";
import { useShellProfile } from "./os/useShellProfile";
import { MobileInstallBanner } from "./os/MobileInstallBanner";

export default function App() {
  const { i18n } = useTranslation();
  const standaloneKey = getStandaloneWindowKey();
  const isMobile = useShellProfile();
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
      <ServerConnectGate>
        <AuthGate>
          <BrowserRouter>
            <ShellRoutes isMobile={isMobile} />
          </BrowserRouter>
          <MobileInstallBanner floating />
        </AuthGate>
      </ServerConnectGate>
    </ElectronShell>
  );
}
