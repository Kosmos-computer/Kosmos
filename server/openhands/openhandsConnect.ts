/**
 * OpenHands Agent Server connection helpers — validate host + API key for Settings.
 */
import { ServerClient } from "@openhands/typescript-client/clients";
import type { AgentBackendConnectionStatus } from "../../shared/types.js";

/** Validate an OpenHands Agent Server connection via GET /server_info. */
export async function testOpenhandsConnection(
  host: string,
  apiKey?: string,
): Promise<AgentBackendConnectionStatus> {
  const trimmedHost = host.trim();
  if (!trimmedHost) {
    return { connected: false, error: "Host is required." };
  }
  const client = new ServerClient({ host: trimmedHost, apiKey: apiKey?.trim() || undefined });
  try {
    const info = await client.getServerInfo();
    return { connected: true, version: info.version };
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenHands connection failed";
    return { connected: false, error: message };
  } finally {
    client.close();
  }
}
