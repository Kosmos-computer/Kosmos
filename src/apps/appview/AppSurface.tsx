import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * AppSurface — renders a generated app inside a window.
 *
 * OpenUI Renderer + the openclaw-os toolProvider pattern: Query/Mutation
 * statements in the app markup call POST /api/tools/invoke directly — the
 * app refreshes live with no LLM in the loop. "Refine" primes the chat
 * composer with the linked-app protocol so edits route to app_update.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Renderer, type ActionEvent } from "@openuidev/react-lang";
import { ThemeProvider } from "@openuidev/react-ui";
import { openuiLibrary } from "@openuidev/react-ui/genui-lib";
import { Code2, RotateCw, Sparkles } from "lucide-react";
import type { StoredApp } from "@shared/types";
import { api } from "../../lib/api";
import { useOsStore } from "../../os/osStore";
import { useWindowStore } from "../../os/windowStore";
import { AdaptiveSurface } from "./AdaptiveSurface";
import { primeComposer } from "../chat/composerBus";

interface Props {
  appId: string;
}

export function AppSurface({ appId }: Props) {
  const theme = useOsStore((s) => s.theme);
  const openWindow = useWindowStore((s) => s.open);
  const [record, setRecord] = useState<StoredApp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // The dock/library summary carries updatedAt — when the agent patches this
  // app (app_update → apps_changed → refreshApps), the changed timestamp
  // triggers a refetch so the open window shows the new version.
  const summaryUpdatedAt = useOsStore(
    (s) => s.apps.find((a) => a.id === appId)?.updatedAt,
  );

  useEffect(() => {
    let cancelled = false;
    api
      .getApp(appId)
      .then((app) => {
        if (!cancelled) {
          setRecord(app);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load app");
      });
    return () => {
      cancelled = true;
    };
  }, [appId, refreshTick, summaryUpdatedAt]);

  const toolProvider = useMemo(
    () => ({
      exec: (args: Record<string, unknown>) => api.invokeTool("exec", args),
      read: (args: Record<string, unknown>) => api.invokeTool("read", args),
      db_query: (args: Record<string, unknown>) => api.invokeTool("db_query", args),
      db_execute: (args: Record<string, unknown>) => api.invokeTool("db_execute", args),
    }),
    [],
  );

  const handleAction = useCallback(
    (event: ActionEvent) => {
      if (event.type === "open_url" && typeof event.params?.url === "string") {
        window.open(event.params.url, "_blank", "noopener");
        return;
      }
      if (event.type === "continue_conversation" && record) {
        const contextText =
          typeof event.params?.context === "string" ? event.params.context : "";
        const text = contextText || event.humanFriendlyMessage || "";
        if (text) {
          openWindow({ type: "system", app: "chat" }, "Chat");
          primeComposer({
            text: `About app "${record.title}" (id: ${record.id}): ${text}`,
            submit: true,
          });
        }
      }
    },
    [record, openWindow],
  );

  const refine = useCallback(() => {
    if (!record) return;
    openWindow({ type: "system", app: "chat" }, "Chat");
    primeComposer({
      text: `Refine app "${record.title}" (id: ${record.id}): `,
      submit: false,
    });
  }, [record, openWindow]);

  if (error) {
    return <div className="arco-empty">{error}</div>;
  }
  if (!record) {
    return <div className="arco-empty"><T k={I18nKey.APPS$APPVIEW_LOADING_APP} /></div>;
  }

  return (
    <div className="arco-appsurface">
      <div className="arco-appsurface__toolbar">
        <button
          className="arco-btn"
          onClick={() => setRefreshTick((t) => t + 1)}
          aria-label={i18n.t(I18nKey.APPS$APPVIEW_REFRESH_APP)}
        >
          <RotateCw size={13} /><T k={I18nKey.COMMON$REFRESH} /></button>
        <button
          className="arco-btn"
          onClick={() => setShowCode((v) => !v)}
          aria-pressed={showCode}
        >
          <Code2 size={13} /> {showCode ? "Preview" : "Code"}
        </button>
        <span style={{ flex: 1 }} />
        <button className="arco-btn arco-btn--primary" onClick={refine}>
          <Sparkles size={13} /><T k={I18nKey.APPS$APPVIEW_REFINE} /></button>
      </div>

      {showCode ? (
        <pre className="arco-appsurface__code arco-scroll">{record.content}</pre>
      ) : (
        <AdaptiveSurface className="arco-appsurface__body arco-scroll">
          <ThemeProvider mode={theme}>
            <Renderer
              key={`${record.id}:${record.updatedAt}:${refreshTick}`}
              response={record.content}
              library={openuiLibrary}
              isStreaming={false}
              toolProvider={toolProvider}
              onAction={handleAction}
              queryLoader={<div className="arco-query-loader" />}
              onError={(errors) => {
                if (errors.length > 0) {
                  console.warn("[arco:app-render]", { appId: record.id, errors });
                }
              }}
            />
          </ThemeProvider>
        </AdaptiveSurface>
      )}
    </div>
  );
}
