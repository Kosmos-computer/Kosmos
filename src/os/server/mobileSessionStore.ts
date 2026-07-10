/**
 * Mobile bundled shells load from http://localhost but call a remote API.
 * HttpOnly cookies set by the server are not sent on those cross-origin
 * requests (SameSite=Lax), so we persist the session bearer token per server.
 */
import { getActiveServerUrl } from "./serverProfileStore";
import { usesRemoteSessionStore } from "./cloudShellMode";

const STORAGE_KEY = "arco.mobileSession.v1";

type SessionMap = Record<string, string>;

function readMap(): SessionMap {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SessionMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: SessionMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getMobileSessionToken(serverUrl?: string | null): string | null {
  if (!usesRemoteSessionStore()) return null;
  const url = serverUrl ?? getActiveServerUrl();
  if (!url) return null;
  return readMap()[url] ?? null;
}

export function setMobileSessionToken(serverUrl: string, token: string): void {
  if (!usesRemoteSessionStore()) return;
  const map = readMap();
  map[serverUrl.replace(/\/$/, "")] = token;
  writeMap(map);
}

export function clearMobileSessionToken(serverUrl?: string | null): void {
  if (!usesRemoteSessionStore()) return;
  const url = (serverUrl ?? getActiveServerUrl())?.replace(/\/$/, "");
  if (!url) return;
  const map = readMap();
  delete map[url];
  writeMap(map);
}
