/**
 * Settings → Advanced — developer app visibility + system repair (doctor).
 */
import { useState } from "react";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import { useOsStore } from "../../os/osStore";
import {
  SettingsAlert,
  SettingsDivider,
  SettingsPage,
  SettingsRow,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
} from "../../components/patterns";
import { Button, Switch } from "../../components/ui";

type DoctorStep = {
  id: string;
  status: "ok" | "skipped" | "fixed" | "error";
  detail: string;
};

export function DoctorRepairSection() {
  const canWrite = useCan("settings:write");
  const developerApps = useOsStore((s) => s.developerApps);
  const setDeveloperApps = useOsStore((s) => s.setDeveloperApps);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<DoctorStep[] | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const report = await api.runDoctor();
      setSteps(report.steps);
      setOk(report.ok);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Repair failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsPage>
      <SettingsSection intro="Optional apps for setup, demos, and generative tooling. Hidden from the dock and Apps library when off.">
        <SettingsStack>
          <SettingsRow>
            <div className="arco-settings-row__label">
              Developer Apps
              <span className="arco-settings-row__hint">
                Onboarding, Setup, Generator, Pay, Image Gen
              </span>
            </div>
            <div className="arco-settings-row__control">
              <Switch
                checked={developerApps}
                onChange={(event) => setDeveloperApps(event.target.checked)}
                aria-label="Developer Apps"
              />
            </div>
          </SettingsRow>
        </SettingsStack>
      </SettingsSection>

      {canWrite ? (
        <>
          <SettingsDivider />
          <SettingsSection intro="Run known data migrations and safe health checks. Safe to repeat.">
            <SettingsStack>
              <SettingsRow>
                <div className="arco-settings-row__label">System repair</div>
                <div className="arco-settings-row__control">
                  <SettingsRowActions>
                    <Button disabled={busy} onClick={() => void run()}>
                      {busy ? "Running…" : "Run repair"}
                    </Button>
                  </SettingsRowActions>
                </div>
              </SettingsRow>
              {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}
              {ok === true ? (
                <SettingsAlert tone="success">Repair finished with no errors.</SettingsAlert>
              ) : null}
              {ok === false ? (
                <SettingsAlert tone="error">Repair finished with one or more errors.</SettingsAlert>
              ) : null}
              {steps && steps.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
                  {steps.map((s) => (
                    <li key={s.id}>
                      <strong>{s.id}</strong> [{s.status}] — {s.detail}
                    </li>
                  ))}
                </ul>
              ) : null}
            </SettingsStack>
          </SettingsSection>
        </>
      ) : null}
    </SettingsPage>
  );
}
