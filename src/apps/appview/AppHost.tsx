/**
 * AppHost — the window surface for installed platform apps.
 *
 * Code-tier apps run in a sandboxed iframe; this host is their only path to
 * the OS. It mints a bridge token for the window, pumps the postMessage
 * protocol, forwards server-bound calls to /api/bridge with that token
 * (identity is never the app's claim), answers shell.* calls locally after a
 * grant check, and pushes the shell's design tokens so well-behaved apps can
 * match the OS theme. Declarative-tier entries render through the existing
 * OpenUI surface instead — same manifest, different container.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCw, ShieldAlert } from "lucide-react";
import type { AppHostMessage } from "@shared/manifest";
import { api } from "../../lib/api";
import { useOsStore } from "../../os/osStore";
import { AppSurface } from "./AppSurface";

/**
 * Collect the shell's design tokens for the app iframe. The shell's own
 * custom properties are branded (--arco-*), but the platform boundary is
 * brand-free: tokens cross into apps under --os-* names, so apps written
 * today survive a shell rebrand. Reads stylesheet rules for names, computed
 * styles for values — robust to theme switches without a hardcoded list.
 */
const SHELL_TOKEN_PREFIX = "--arco-";
const APP_TOKEN_PREFIX = "--os-";

function collectAppTokens(): Record<string, string> {
  const names = new Set<string>();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // Cross-origin sheet — none of ours.
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSStyleRule)) continue;
      for (const prop of Array.from(rule.style)) {
        if (prop.startsWith(SHELL_TOKEN_PREFIX)) names.add(prop);
      }
    }
  }
  const computed = getComputedStyle(document.documentElement);
  const tokens: Record<string, string> = {};
  for (const name of names) {
    const value = computed.getPropertyValue(name).trim();
    if (value) tokens[APP_TOKEN_PREFIX + name.slice(SHELL_TOKEN_PREFIX.length)] = value;
  }
  return tokens;
}

export function AppHost({ appId }: { appId: string }) {
  const app = useOsStore((s) => s.installedApps.find((e) => e.manifest.id === appId));
  const theme = useOsStore((s) => s.theme);
  const notify = useOsStore((s) => s.notify);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const [frameTick, setFrameTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const entry = app?.manifest.entry;
  const src =
    entry?.kind === "bundle"
      ? `/apps/${entry.path}/index.html`
      : entry?.kind === "url"
        ? entry.url
        : null;

  useEffect(() => {
    if (!app || entry?.kind === "openui") return;
    setError(null);
    api
      .mintAppToken(appId)
      .then(({ token }) => setToken(token))
      .catch((err: Error) => setError(err.message));
  }, [appId, app, entry?.kind, frameTick]);

  const postToApp = useCallback(
    (message: AppHostMessage) => {
      const target = iframeRef.current?.contentWindow;
      if (!target || !src) return;
      const targetOrigin = src.startsWith("/") ? window.location.origin : new URL(src).origin;
      target.postMessage(message, targetOrigin);
    },
    [src],
  );

  const pushTheme = useCallback(() => {
    postToApp({ appBridge: true, type: "theme", theme, tokens: collectAppTokens() });
  }, [postToApp, theme]);

  // Re-push tokens whenever the OS theme flips while the window is open.
  useEffect(() => {
    pushTheme();
  }, [pushTheme]);

  useEffect(() => {
    if (!app || !token) return;
    const grants = app.grants;

    const onMessage = (event: MessageEvent) => {
      // Identity check: only our own iframe's window, nothing else.
      if (event.source !== iframeRef.current?.contentWindow) return;
      const msg = event.data as AppHostMessage;
      if (!msg || msg.appBridge !== true) return;

      if (msg.type === "ready") {
        pushTheme();
        return;
      }
      if (msg.type !== "request") return;

      const respond = (ok: boolean, result?: unknown, errorText?: string) =>
        postToApp({ appBridge: true, type: "response", id: msg.id, ok, result, error: errorText });

      // Client-side shell calls are granted and executed here; everything
      // else goes to the server bridge with the window token.
      if (msg.method === "shell.notify") {
        if (grants["shell:notify"] !== "granted") {
          respond(false, undefined, `Permission denied: notifications are not granted for ${app.manifest.name}.`);
          return;
        }
        notify(`${app.manifest.name}: ${String(msg.params.message ?? "")}`);
        respond(true, { ok: true });
        return;
      }

      api
        .bridgeInvoke(token, msg.method, msg.params)
        .then((result) => respond(true, result))
        .catch((err: Error) => respond(false, undefined, err.message));
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [app, token, notify, postToApp, pushTheme]);

  if (!app) return <div className="arco-empty">This app is no longer installed.</div>;
  if (!app.enabled) return <div className="arco-empty">{app.manifest.name} is disabled in Settings.</div>;

  // Declarative tier: the manifest points at an OpenUI app — render it with
  // the existing generative surface (same manifest system, no iframe).
  if (entry?.kind === "openui") {
    return <AppSurface appId={entry.appId} />;
  }

  return (
    <div className="arco-appsurface">
      <div className="arco-appsurface__toolbar">
        <ShieldAlert size={13} style={{ color: "var(--arco-text-tertiary)" }} />
        <span className="arco-studio__editorpath" style={{ flex: 1 }}>
          {app.manifest.name} · v{app.manifest.version} · {app.manifest.tier}
        </span>
        <button
          className="arco-btn arco-btn--icon"
          onClick={() => setFrameTick((t) => t + 1)}
          aria-label="Reload app"
        >
          <RotateCw size={12} />
        </button>
      </div>
      {error ? (
        <div className="arco-empty">
          <span>{error}</span>
          <button className="arco-btn arco-btn--primary" onClick={() => setFrameTick((t) => t + 1)}>
            Try again
          </button>
        </div>
      ) : token && src ? (
        <iframe
          key={frameTick}
          ref={iframeRef}
          className="arco-studio__frame"
          src={src}
          title={app.manifest.name}
          // Same-origin bundles keep allow-same-origin (matches WebAppSurface);
          // the hardening plan gives remote apps a distinct origin later.
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        />
      ) : (
        <div className="arco-empty">Starting {app.manifest.name}…</div>
      )}
    </div>
  );
}
