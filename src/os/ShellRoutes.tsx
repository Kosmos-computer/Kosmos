/**
 * Shell route table — each path opens/focuses the matching app on load.
 */
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { parseLaunchAppParam } from "@shared/launchApp";
import { DEFAULT_SHELL_APP, shellPathForSystemApp } from "@shared/shellRoutes";
import { Desktop } from "./Desktop";
import { MobileShell } from "./MobileShell";
import { CommandPalette } from "./CommandPalette";
import { ShellRouteSync } from "./ShellRouteSync";

function ShellRedirect() {
  const { search } = useLocation();
  const launchId = parseLaunchAppParam(search);
  const target = launchId ? shellPathForSystemApp(launchId) : `/${DEFAULT_SHELL_APP}`;
  return <Navigate to={target} replace />;
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
      <Route path="/" element={<ShellRedirect />} />
      <Route path="/generated/:appId" element={<ShellOutlet isMobile={isMobile} />} />
      <Route path="/installed/:appId" element={<ShellOutlet isMobile={isMobile} />} />
      <Route path="/web/:webAppId" element={<ShellOutlet isMobile={isMobile} />} />
      <Route path="/settings/:section" element={<ShellOutlet isMobile={isMobile} />} />
      <Route path="/settings" element={<ShellOutlet isMobile={isMobile} />} />
      <Route path="/:appId" element={<ShellOutlet isMobile={isMobile} />} />
      <Route path="*" element={<Navigate to={`/${DEFAULT_SHELL_APP}`} replace />} />
    </Routes>
  );
}
