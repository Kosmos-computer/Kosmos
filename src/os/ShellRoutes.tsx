/**
 * Shell route table — each path opens/focuses the matching app on load.
 */
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { parseLaunchAppParam } from "@shared/launchApp";
import { shellPathForSystemApp } from "@shared/shellRoutes";
import { Desktop } from "./Desktop";
import { MobileShell } from "./MobileShell";
import { CommandPalette } from "./CommandPalette";
import { ShellRouteSync } from "./ShellRouteSync";

/** Home route — desktop with no app auto-opened; still honors legacy ?app= launches. */
function ShellHome({ isMobile }: { isMobile: boolean }) {
  const { search } = useLocation();
  const launchId = parseLaunchAppParam(search);
  if (launchId) {
    return <Navigate to={shellPathForSystemApp(launchId)} replace />;
  }
  return <ShellOutlet isMobile={isMobile} />;
}

function ShellOutlet({ isMobile }: { isMobile: boolean }) {
  return (
    <>
      {isMobile ? <MobileShell /> : <Desktop />}
      <CommandPalette />
      <ShellRouteSync />
    </>
  );
}

export function ShellRoutes({ isMobile }: { isMobile: boolean }) {
  return (
    <Routes>
      <Route path="/" element={<ShellHome isMobile={isMobile} />} />
      <Route path="/generated/:appId" element={<ShellOutlet isMobile={isMobile} />} />
      <Route path="/installed/:appId" element={<ShellOutlet isMobile={isMobile} />} />
      <Route path="/web/:webAppId" element={<ShellOutlet isMobile={isMobile} />} />
      <Route path="/settings/:section" element={<ShellOutlet isMobile={isMobile} />} />
      <Route path="/settings" element={<ShellOutlet isMobile={isMobile} />} />
      <Route path="/:appId" element={<ShellOutlet isMobile={isMobile} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
