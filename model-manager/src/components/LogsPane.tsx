/**
 * Engine logs — router prefixes each child's output with its port, so one
 * stream covers the router and every model process.
 */
import { useEffect, useRef } from "react";
import { ScrollText } from "lucide-react";
import { useStore } from "../state/store";

export function LogsPane() {
  const logs = useStore((s) => s.logs);
  const ref = useRef<HTMLDivElement>(null);

  // Follow the tail unless the user has scrolled up.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <div className="mm-card" style={{ flex: 1, minHeight: 0 }}>
      <div className="mm-card__title">
        <span>
          <ScrollText size={13} style={{ verticalAlign: -2, marginRight: 6 }} />
          Engine logs
        </span>
      </div>
      <div className="mm-logs" ref={ref}>
        {logs.length === 0 ? "Engine not started." : logs.join("\n")}
      </div>
    </div>
  );
}
