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
import {
  ModuleFilterSelect,
  SettingsAlert,
  SettingsFieldRow,
  SettingsRow,
  SettingsRowActions,
  SettingsStack,
} from "../../components/patterns";
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
    <SettingsStack className="arco-settings-backend-pane">
      <SettingsFieldRow
        label={i18n.t(I18nKey.APPS$STARTUP_API_KEY)}
        htmlFor="set-cursor-key"
        hint={
          <>
            <T k={I18nKey.APPS$SETTINGS_CREATE_A_KEY_AT} />{" "}
            <a href="https://cursor.com/dashboard/integrations" target="_blank" rel="noreferrer">
              <T k={I18nKey.APPS$SETTINGS_CURSOR_COM_DASHBOARD_INTEGRATIONS} />
            </a>
            <T k={I18nKey.APPS$SETTINGS_STORED_SERVER_SIDE_AND_MASKED_ON_READ} />
          </>
        }
        layout="stack"
      >
        <Input
          id="set-cursor-key"
          width="auto"
          type="password"
          value={settings.cursorApiKey}
          placeholder={i18n.t(I18nKey.APPS$SETTINGS_CURSOR)}
          onChange={(e) => update({ cursorApiKey: e.target.value })}
        />
      </SettingsFieldRow>

      <SettingsRow className="arco-settings-backend-pane__actions">
        <SettingsRowActions>
          <Button variant="default" disabled={testing} onClick={() => void testConnection()}>
            {testing ? "Testing…" : "Test connection"}
          </Button>
        </SettingsRowActions>
      </SettingsRow>

      {status?.connected ? (
        <SettingsRow className="arco-settings-backend-pane__note">
          <SettingsAlert tone="success">
            <T k={I18nKey.APPS$SETTINGS_CONNECTED_AS} />
            {status.user?.apiKeyName}
            {status.user?.userEmail ? ` (${status.user.userEmail})` : ""}
          </SettingsAlert>
        </SettingsRow>
      ) : null}
      {status && !status.connected && status.error ? (
        <SettingsRow className="arco-settings-backend-pane__note">
          <SettingsAlert tone="error">{status.error}</SettingsAlert>
        </SettingsRow>
      ) : null}
      {error ? (
        <SettingsRow className="arco-settings-backend-pane__note">
          <SettingsAlert tone="error">{error}</SettingsAlert>
        </SettingsRow>
      ) : null}

      <SettingsFieldRow
        label={i18n.t(I18nKey.APPS$SETTINGS_RUNTIME)}
        hint="Local runs on this machine; Cloud runs on a Cursor-hosted VM."
        layout="stack"
      >
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
          layout="stack"
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
        layout="stack"
      >
        {models.length > 0 ? (
          <ModuleFilterSelect
            label={i18n.t(I18nKey.APPS$SETTINGS_CURSOR_MODEL)}
            value={settings.cursorModel || CURSOR_DEFAULT_MODEL}
            options={models.map((model) => ({ value: model.id, label: model.displayName }))}
            onChange={(next) => update({ cursorModel: next })}
            searchable="auto"
          />
        ) : (
          <Input
            id="set-cursor-model"
            width="auto"
            value={settings.cursorModel}
            placeholder={CURSOR_DEFAULT_MODEL}
            onChange={(e) => update({ cursorModel: e.target.value })}
          />
        )}
      </SettingsFieldRow>

      <SettingsRow className="arco-settings-backend-pane__actions">
        <SettingsRowActions>
          <Button
            variant="ghost"
            disabled={loadingModels || !hasKey}
            onClick={() => void loadModels()}
          >
            {loadingModels ? "Loading…" : "Refresh models"}
          </Button>
        </SettingsRowActions>
      </SettingsRow>
    </SettingsStack>
  );
}
