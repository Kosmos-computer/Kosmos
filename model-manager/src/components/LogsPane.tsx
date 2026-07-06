/**
 * Engine logs — router prefixes each child's output with its port, so one
 * stream covers the router and every model process.
 */
import { useEffect, useRef } from "react";
import { ScrollText } from "lucide-react";
import { SettingsPanelBody, SettingsPanelHeader } from "@arco/components/patterns/SettingsLayout";
import { useStore } from "../state/store";

export function LogsPane() {
  const logs = useStore((s) => s.logs);
  const ref = useRef<HTMLPreElement>(null);

  // Follow the tail unless the user has scrolled up.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <section className="arco-card arco-models-log-pane">
      <SettingsPanelHeader>
        <span className="arco-settings-panel__title">
          <ScrollText size={13} className="arco-icon arco-icon--secondary" />
          Engine logs
        </span>
      </SettingsPanelHeader>
      <SettingsPanelBody>
        <pre ref={ref} className="arco-settings-log arco-models-log">
          {logs.length === 0 ? "Engine not started." : logs.join("\n")}
        </pre>
      </SettingsPanelBody>
    </section>
  );
}
