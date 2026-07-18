/**
 * Settings → Advanced — Run repair (doctor migrations).
 */
import { useState } from "react";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import {
  SettingsAlert,
  SettingsDivider,
  SettingsRow,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
} from "../../components/patterns";
import { Button } from "../../components/ui";

type DoctorStep = {
  id: string;
  status: "ok" | "skipped" | "fixed" | "error";
  detail: string;
};

export function DoctorRepairSection() {
  const canWrite = useCan("settings:write");
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

  if (!canWrite) return null;

  return (
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
          {ok === true ? <SettingsAlert tone="success">Repair finished with no errors.</SettingsAlert> : null}
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
  );
}
