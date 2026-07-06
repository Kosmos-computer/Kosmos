import { systemApp } from "./systemApps";
import { useWindowStore, type WindowKind } from "./windowStore";
import { AppSurface } from "../apps/appview/AppSurface";
import { WebAppSurface } from "../apps/appview/WebAppSurface";
import { AppHost } from "../apps/appview/AppHost";

export function WindowContent({ kind }: { kind: WindowKind }) {
  if (kind.type === "system") {
    const Component = systemApp(kind.app).component;
    return <Component />;
  }
  if (kind.type === "web") {
    return <WebAppSurface webAppId={kind.webAppId} />;
  }
  if (kind.type === "installed") {
    return <AppHost appId={kind.appId} />;
  }
  return <AppSurface appId={kind.appId} />;
}

export function WindowContentById({ winId }: { winId: string }) {
  const win = useWindowStore((s) => s.windows.find((w) => w.id === winId));
  if (!win) return null;
  return <WindowContent kind={win.kind} />;
}
