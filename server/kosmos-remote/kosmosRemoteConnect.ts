/**
 * Remote kosmos connection helper — validate a host + scoped bearer token
 * for Settings, using the lightweight authenticated /api/remote/ping route.
 */
import type { AgentBackendConnectionStatus } from "../../shared/types.js";

export async function testKosmosConnection(host: string, token: string): Promise<AgentBackendConnectionStatus> {
  const trimmedHost = host.trim();
  if (!trimmedHost) return { connected: false, error: "Host is required." };
  if (!token.trim()) return { connected: false, error: "Bearer token is required." };
  try {
    const res = await fetch(`${trimmedHost.replace(/\/$/, "")}/api/remote/ping`, {
      headers: { Authorization: `Bearer ${token.trim()}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { connected: false, error: `HTTP ${res.status}${body ? ` ${body.slice(0, 200)}` : ""}` };
    }
    return { connected: true };
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : "Kosmos connection failed" };
  }
}
