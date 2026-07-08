import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Cursor connection fields — API key, model, runtime, and connection test.
 * Shown in Settings → Agent when the Cursor runtime is selected.
 */
import { useCallback, useState } from "react";
import type { CursorConnectionStatus, CursorModelInfo, CursorRuntime, Settings } from "@shared/types";
import { CURSOR_DEFAULT_MODEL } from "@shared/types";
import { api } from "../../lib/api";
import { SettingsAlert, SettingsFieldRow, SettingsStack } from "../../components/patterns";
import { Button, Chip, Input } from "../../components/ui";

interface CursorConnectionFieldsProps {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

export function CursorConnectionFields({ settings, update }: CursorConnectionFieldsProps) {
  const [status, setStatus] = useState<CursorConnectionStatus | null>(null);
  const [models, setModels] = useState<CursorModelInfo[]>([]);
  const [testing, setTesting] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasKey = Boolean(settings.cursorApiKey && !settings.cursorApiKey.startsWith("••••"));

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    setError(null);
    try {
      const result = await api.listCursorModels();
      setModels(result.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load models");
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const testConnection = useCallback(async () => {
    setTesting(true);
    setError(null);
    try {
      const result = await api.testCursorConnection(
        hasKey ? settings.cursorApiKey : undefined,
      );
      setStatus(result);
      if (result.connected) {
        await loadModels();
      }
    } catch (err) {
      setStatus({ connected: false, error: err instanceof Error ? err.message : "Connection failed" });
    } finally {
      setTesting(false);
    }
  }, [hasKey, loadModels, settings.cursorApiKey]);

  const pickRuntime = (runtime: CursorRuntime) => update({ cursorRuntime: runtime });

  return (
    <SettingsStack>
      <SettingsFieldRow
        label={i18n.t(I18nKey.APPS$STARTUP_API_KEY)}
        htmlFor="set-cursor-key"
        hint={
          <><T k={I18nKey.APPS$SETTINGS_CREATE_A_KEY_AT} />{" "}
            <a href="https://cursor.com/dashboard/integrations" target="_blank" rel="noreferrer"><T k={I18nKey.APPS$SETTINGS_CURSOR_COM_DASHBOARD_INTEGRATIONS} /></a><T k={I18nKey.APPS$SETTINGS_STORED_SERVER_SIDE_AND_MASKED_ON_READ} /></>
        }
      >
        <Input
          id="set-cursor-key"
          width="auto"
          type="password"
          value={settings.cursorApiKey}
          placeholder={i18n.t(I18nKey.APPS$SETTINGS_CURSOR)}
          onChange={(e) => update({ cursorApiKey: e.target.value })}
        />
        <Button variant="default" disabled={testing} onClick={() => void testConnection()}>
          {testing ? "Testing…" : "Test connection"}
        </Button>
      </SettingsFieldRow>

      {status?.connected ? (
        <SettingsAlert tone="success"><T k={I18nKey.APPS$SETTINGS_CONNECTED_AS} />{status.user?.apiKeyName}
          {status.user?.userEmail ? ` (${status.user.userEmail})` : ""}
        </SettingsAlert>
      ) : null}
      {status && !status.connected && status.error ? (
        <SettingsAlert tone="error">{status.error}</SettingsAlert>
      ) : null}
      {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}

      <SettingsFieldRow label={i18n.t(I18nKey.APPS$SETTINGS_RUNTIME)} hint="Local runs on this machine; Cloud runs on a Cursor-hosted VM.">
        <div className="arco-settings-chip-row">
          {(["local", "cloud"] as const).map((runtime) => (
            <Chip
              key={runtime}
              active={settings.cursorRuntime === runtime}
              onClick={() => pickRuntime(runtime)}
            >
              {runtime}
            </Chip>
          ))}
        </div>
      </SettingsFieldRow>

      {settings.cursorRuntime === "cloud" ? (
        <SettingsFieldRow
          label={i18n.t(I18nKey.APPS$SETTINGS_REPOSITORY)}
          htmlFor="set-cursor-repo"
          hint="GitHub repo URL the cloud agent clones — required for cloud runtime."
        >
          <Input
            id="set-cursor-repo"
            width="auto"
            value={settings.cursorRepoUrl}
            placeholder="https://github.com/org/repo"
            onChange={(e) => update({ cursorRepoUrl: e.target.value })}
          />
        </SettingsFieldRow>
      ) : null}

      <SettingsFieldRow
        label={i18n.t(I18nKey.APPS$SETTINGS_MODEL)}
        htmlFor="set-cursor-model"
        hint="Required for local agents. Test connection to load available models."
      >
        {models.length > 0 ? (
          <select
            id="set-cursor-model"
            className="arco-input arco-input--compact"
            value={settings.cursorModel || CURSOR_DEFAULT_MODEL}
            onChange={(e) => update({ cursorModel: e.target.value })}
            aria-label={i18n.t(I18nKey.APPS$SETTINGS_CURSOR_MODEL)}
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.displayName}
              </option>
            ))}
          </select>
        ) : (
          <Input
            id="set-cursor-model"
            width="auto"
            value={settings.cursorModel}
            placeholder={CURSOR_DEFAULT_MODEL}
            onChange={(e) => update({ cursorModel: e.target.value })}
          />
        )}
        <Button variant="ghost" disabled={loadingModels || !hasKey} onClick={() => void loadModels()}>
          {loadingModels ? "Loading…" : "Refresh models"}
        </Button>
      </SettingsFieldRow>
    </SettingsStack>
  );
}
