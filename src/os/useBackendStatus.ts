import { useEffect, useState } from "react";
import { api } from "../lib/api";

export type BackendStatus = "checking" | "online" | "offline";

const POLL_MS = 5000;

export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      try {
        await api.installStatus();
        if (!cancelled) setStatus("online");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    }

    void probe();
    const id = window.setInterval(() => void probe(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return status;
}

export function backendStatusLabel(status: BackendStatus): string {
  if (status === "checking") return "Connecting to backend…";
  if (status === "online") return "Backend online";
  return "Backend offline";
}
