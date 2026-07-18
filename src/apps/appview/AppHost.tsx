import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCw, ShieldAlert } from "lucide-react";
import type { AppHostMessage, AppToolbarSlot } from "@shared/manifest";
import { api } from "../../lib/api";
import { onAppEvent } from "../../os/appEventBus";
import { installedLaunchKey, useDocumentLaunchStore } from "../../os/documentLaunchStore";
import { primeComposer } from "../chat/composerBus";
import { useWindowStore, windowKey } from "../../os/windowStore";
import { useOsStore } from "../../os/osStore";
import { AppSurface } from "./AppSurface";
import {
  registerIframeUiDriver,
  unregisterIframeUiDriver,
  type GuestUiCommand,
  type GuestUiSnapshot,
} from "../../os/cursor/iframeUiBridge";

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

  // Legacy aliases used by installed apps before canonical --arco-* names existed.
  const aliasSources: Record<string, string> = {
    "bg-base": "--arco-bg-base",
    "bg-raised": "--arco-bg-raised",
    "font-sans": "--arco-font-sans",
  };
  for (const [suffix, source] of Object.entries(aliasSources)) {
    const value = computed.getPropertyValue(source).trim();
    if (value) tokens[`${APP_TOKEN_PREFIX}${suffix}`] = value;
  }

  return tokens;
}

export function AppHost({ appId }: { appId: string }) {
  const app = useOsStore((s) => s.installedApps.find((e) => e.manifest.id === appId));
  const theme = useOsStore((s) => s.theme);
  const accentPreset = useOsStore((s) => s.accentPreset);
  const radiusPreset = useOsStore((s) => s.radiusPreset);
  const fontPreset = useOsStore((s) => s.fontPreset);
  const textScalePreset = useOsStore((s) => s.textScalePreset);
  const spacingPreset = useOsStore((s) => s.spacingPreset);
  const notify = useOsStore((s) => s.notify);
  const [launchFileId, setLaunchFileId] = useState(
    () => useDocumentLaunchStore.getState().consume(installedLaunchKey(appId)) ?? undefined,
  );

  // Agent / Drive can request a different file while this host is already mounted.
  useEffect(() => {
    const key = installedLaunchKey(appId);
    return useDocumentLaunchStore.subscribe((state) => {
      if (!state.pendingByTarget[key]) return;
      const consumed = useDocumentLaunchStore.getState().consume(key);
      if (consumed) setLaunchFileId(consumed);
    });
  }, [appId]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const [frameTick, setFrameTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [toolbarSlots, setToolbarSlots] = useState<AppToolbarSlot[]>([]);
  const uiSeq = useRef(0);
  const uiPending = useRef(
    new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>(),
  );

  const installedWindowId = windowKey({ type: "installed", appId });

  const entry = app?.manifest.entry;
  const baseSrc =
    entry?.kind === "bundle"
      ? `/apps/${entry.path}/index.html`
      : entry?.kind === "url"
        ? entry.url
        : null;

  const src = useMemo(() => {
    if (!baseSrc || !launchFileId) return baseSrc;
    const url = baseSrc.startsWith("/")
      ? new URL(baseSrc, window.location.origin)
      : new URL(baseSrc);
    url.searchParams.set("fileId", launchFileId);
    url.hash = `file=${encodeURIComponent(launchFileId)}`;
    return url.pathname + url.search + url.hash;
  }, [baseSrc, launchFileId]);

  useEffect(() => {
    if (!app || entry?.kind === "openui") return;
    setError(null);
    api
      .mintAppToken(appId)
      .then(({ token }) => setToken(token))
      .catch((err: Error) => setError(err.message));
  }, [appId, app, entry?.kind, frameTick]);

  useEffect(() => {
    setToolbarSlots([]);
  }, [frameTick]);

  const postToApp = useCallback(
    (message: AppHostMessage) => {
      const target = iframeRef.current?.contentWindow;
      if (!target || !src) return;
      const targetOrigin = src.startsWith("/") ? window.location.origin : new URL(src).origin;
      target.postMessage(message, targetOrigin);
    },
    [src],
  );

  const sendUiCommand = useCallback(
    (command: GuestUiCommand) =>
      new Promise<unknown>((resolve, reject) => {
        const id = ++uiSeq.current;
        uiPending.current.set(id, { resolve, reject });
        postToApp({ appBridge: true, type: "ui.command", id, command });
        window.setTimeout(() => {
          if (!uiPending.current.has(id)) return;
          uiPending.current.delete(id);
          reject(new Error("App UI bridge timed out — is createAppClient() loaded?"));
        }, 4_000);
      }),
    [postToApp],
  );

  // Register agent cursor path #2 while this AppHost iframe is mounted.
  useEffect(() => {
    if (entry?.kind === "openui") return;
    registerIframeUiDriver(installedWindowId, async (command) => {
      try {
        const result = await sendUiCommand(command);
        if (command.kind === "snapshot") {
          const snap = result as GuestUiSnapshot;
          const frame = iframeRef.current?.getBoundingClientRect();
          const ox = frame?.x ?? 0;
          const oy = frame?.y ?? 0;
          return {
            elements: (snap.elements ?? []).map((el) => ({
              ...el,
              // Guest rects are iframe-local; translate to shell viewport for the cursor.
              rect: {
                ...el.rect,
                x: Math.round(el.rect.x + ox),
                y: Math.round(el.rect.y + oy),
              },
            })),
          };
        }
        return { ok: true as const };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    });
    return () => unregisterIframeUiDriver(installedWindowId);
  }, [installedWindowId, sendUiCommand, entry?.kind, frameTick]);

  const pushTheme = useCallback(() => {
    postToApp({ appBridge: true, type: "theme", theme, tokens: collectAppTokens() });
  }, [postToApp, theme, accentPreset, radiusPreset, fontPreset, textScalePreset, spacingPreset]);

  // Re-push tokens whenever the OS theme flips while the window is open.
  useEffect(() => {
    pushTheme();
  }, [pushTheme]);

  // Forward platform events (files.changed, …) into the iframe — but only
  // topics the manifest subscribes to; everything else stays invisible.
  useEffect(() => {
    const subscribed = app?.manifest.events?.subscribes ?? [];
    if (subscribed.length === 0) return;
    return onAppEvent(({ topic }) => {
      if (subscribed.includes(topic)) postToApp({ appBridge: true, type: "event", topic });
    });
  }, [app?.manifest.events?.subscribes, postToApp, app]);

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
      if (msg.type === "toolbar-set") {
        setToolbarSlots(msg.slots);
        return;
      }
      if (msg.type === "ui.result") {
        const pending = uiPending.current.get(msg.id);
        if (!pending) return;
        uiPending.current.delete(msg.id);
        if (msg.ok) pending.resolve(msg.result);
        else pending.reject(new Error(msg.error || "UI bridge command failed"));
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

      if (msg.method === "shell.askAgent") {
        if (grants["shell:agent"] !== "granted") {
          respond(false, undefined, `Permission denied: Chat access is not granted for ${app.manifest.name}.`);
          return;
        }
        const text = String(msg.params.text ?? "");
        const submit = msg.params.submit === true;
        const wm = useWindowStore.getState();
        const chatKey = windowKey({ type: "system", app: "chat" });
        wm.open({ type: "system", app: "chat" }, "Chat");
        wm.focus(chatKey);
        primeComposer({ text, submit });
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

  if (!app) return <div className="arco-empty"><T k={I18nKey.APPS$APPVIEW_THIS_APP_IS_NO_LONGER_INSTALLED} /></div>;
  if (!app.enabled) return <div className="arco-empty">{app.manifest.name}<T k={I18nKey.APPS$APPVIEW_IS_DISABLED_IN_SETTINGS} /></div>;

  // Declarative tier: the manifest points at an OpenUI app — render it with
  // the existing generative surface (same manifest system, no iframe).
  if (entry?.kind === "openui") {
    return <AppSurface appId={entry.appId} />;
  }

  // Prefer manifest chrome.toolbar; also hide for calculator by id so a
  // stale installed-apps.json (pre-seed-refresh) doesn't leave the strip up.
  const showToolbar =
    appId !== "core.calculator" && app.manifest.chrome?.toolbar !== false;

  return (
    <div className="arco-appsurface">
      {showToolbar ? (
        <div className="arco-appsurface__toolbar">
          <ShieldAlert size={13} style={{ color: "var(--arco-text-tertiary)" }} />
          <span className="arco-studio__editorpath">
            {app.manifest.name}<T k={I18nKey.APPS$APPVIEW_V} />{app.manifest.version} · {app.manifest.tier}
          </span>
          {toolbarSlots.map((slot) =>
            slot.kind === "search" ? (
              <input
                key={slot.id}
                type="search"
                className="arco-input arco-appsurface__toolbar-search"
                placeholder={slot.placeholder}
                value={slot.value ?? ""}
                aria-label={slot.label ?? slot.placeholder ?? "Search"}
                onChange={(event) => {
                  const value = event.target.value;
                  setToolbarSlots((prev) =>
                    prev.map((each) => (each.id === slot.id ? { ...each, value } : each)),
                  );
                  postToApp({ appBridge: true, type: "toolbar-input", id: slot.id, value });
                }}
              />
            ) : null,
          )}
          <button
            className="arco-btn arco-btn--icon"
            onClick={() => setFrameTick((t) => t + 1)}
            aria-label={i18n.t(I18nKey.APPS$APPVIEW_RELOAD_APP)}
          >
            <RotateCw size={12} />
          </button>
        </div>
      ) : null}
      {error ? (
        <div className="arco-empty">
          <span>{error}</span>
          <button className="arco-btn arco-btn--primary" onClick={() => setFrameTick((t) => t + 1)}><T k={I18nKey.APPS$APPVIEW_TRY_AGAIN} /></button>
        </div>
      ) : token && src ? (
        <iframe
          key={`${frameTick}:${launchFileId ?? ""}`}
          ref={iframeRef}
          className="arco-studio__frame"
          src={src}
          title={app.manifest.name}
          // Same-origin bundles keep allow-same-origin (matches WebAppSurface);
          // the hardening plan gives remote apps a distinct origin later.
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        />
      ) : (
        <div className="arco-empty"><T k={I18nKey.APPS$APPVIEW_STARTING} />{app.manifest.name}…</div>
      )}
    </div>
  );
}
