import { FlaskConical } from "lucide-react";

/** Banner shown on settings sections ported from UI Experiments — interactions are local only. */
export function SettingsStubNotice() {
  return (
    <div className="arco-settings-stub-notice" role="status">
      <FlaskConical size={15} strokeWidth={1.75} aria-hidden="true" />
      <p>
        <strong>UI stub</strong> — ported from UI Experiments. Controls update local mock state only; wire to
        settings API in a later phase.
      </p>
    </div>
  );
}
