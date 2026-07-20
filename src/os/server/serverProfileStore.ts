/**
 * Mobile shell server profiles — persisted client-side (not on the Arco backend).
 * Each profile points at a separate Arco instance with its own users and data.
 */
import type { DiscoveredServer, ServerProfile, ServerProfileKind, ServerProfileSnapshot } from "./serverProfileTypes";
import { detectDeviceWifiSubnet, isChromeOsDevice } from "./deviceNetwork";

const STORAGE_KEY = "arco.serverProfiles.v1";

function emptySnapshot(): ServerProfileSnapshot {
  return { profiles: [], activeId: null, scanSubnet: null };
}

function readSnapshot(): ServerProfileSnapshot {
  if (typeof localStorage === "undefined") return emptySnapshot();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as ServerProfileSnapshot;
    return {
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      activeId: parsed.activeId ?? null,
      scanSubnet: parsed.scanSubnet ?? null,
    };
  } catch {
    return emptySnapshot();
  }
}

function writeSnapshot(snapshot: ServerProfileSnapshot): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function normalizeServerUrl(raw: string): string {
  let value = raw.trim();
  if (!value) throw new Error("Enter a server address");
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  const url = new URL(value);
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Use the server root only (no path)");
  }
  return url.origin.replace(/\/$/, "");
}

export function subnetFromOrigin(origin: string): string | null {
  try {
    const host = new URL(origin).hostname;
    const parts = host.split(".");
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
      return parts.slice(0, 3).join(".");
    }
  } catch {
    // ignore
  }
  return null;
}

export function getActiveServerProfile(): ServerProfile | null {
  const snap = readSnapshot();
  if (!snap.activeId) return null;
  return snap.profiles.find((p) => p.id === snap.activeId) ?? null;
}

export function getActiveServerUrl(): string | null {
  return getActiveServerProfile()?.url ?? null;
}

export function listServerProfiles(): ServerProfile[] {
  return readSnapshot().profiles;
}

export function getScanSubnet(): string | null {
  return readSnapshot().scanSubnet;
}

export function rememberScanSubnet(origin: string): void {
  const subnet = subnetFromOrigin(origin);
  if (!subnet) return;
  const snap = readSnapshot();
  writeSnapshot({ ...snap, scanSubnet: subnet });
}

export function upsertServerProfile(input: {
  name: string;
  url: string;
  kind?: ServerProfileKind;
  id?: string;
}): ServerProfile {
  const url = normalizeServerUrl(input.url);
  const snap = readSnapshot();
  const byUrl = snap.profiles.find((p) => p.url === url);
  const id = input.id ?? byUrl?.id ?? crypto.randomUUID();
  const profile: ServerProfile = {
    id,
    name: input.name.trim() || byUrl?.name || url,
    url,
    kind: input.kind ?? byUrl?.kind ?? "custom",
    lastUsedAt: Date.now(),
  };
  const idx = snap.profiles.findIndex((p) => p.id === id || p.url === url);
  const profiles =
    idx >= 0
      ? snap.profiles.map((p, i) => (i === idx ? { ...p, ...profile, id: p.id } : p))
      : [...snap.profiles, profile];
  const activeId = profiles.find((p) => p.url === url)?.id ?? id;
  writeSnapshot({ ...snap, profiles, activeId, scanSubnet: subnetFromOrigin(url) ?? snap.scanSubnet });
  rememberScanSubnet(url);
  return profiles.find((p) => p.id === activeId) ?? profile;
}

export function activateServerProfile(id: string): ServerProfile | null {
  const snap = readSnapshot();
  const profile = snap.profiles.find((p) => p.id === id);
  if (!profile) return null;
  writeSnapshot({
    ...snap,
    activeId: id,
    profiles: snap.profiles.map((p) =>
      p.id === id ? { ...p, lastUsedAt: Date.now() } : p,
    ),
  });
  return profile;
}

export function removeServerProfile(id: string): void {
  const snap = readSnapshot();
  const profiles = snap.profiles.filter((p) => p.id !== id);
  writeSnapshot({
    ...snap,
    profiles,
    activeId: snap.activeId === id ? profiles[0]?.id ?? null : snap.activeId,
  });
}

export function clearActiveServerProfile(): void {
  const snap = readSnapshot();
  writeSnapshot({ ...snap, activeId: null });
}

export function hasActiveServerProfile(): boolean {
  return getActiveServerProfile() !== null;
}

/** Probe /api/auth/status — works without session cookie. */
export async function testServerConnection(
  origin: string,
  timeoutMs = 8000,
): Promise<{ ok: true; needsSetup: boolean; label: string } | { ok: false; error: string }> {
  const url = `${normalizeServerUrl(origin)}/api/auth/status`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      credentials: "include",
      mode: "cors",
    });
    if (!res.ok) {
      return { ok: false, error: `Server returned ${res.status}` };
    }
    const body = (await res.json()) as { needsSetup?: boolean };
    return {
      ok: true,
      needsSetup: !!body.needsSetup,
      label: body.needsSetup ? "New instance (setup required)" : "Arco server",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message.includes("abort") ? "Connection timed out" : message };
  } finally {
    clearTimeout(timer);
  }
}

async function probeOrigin(origin: string, source: DiscoveredServer["source"], label: string) {
  const result = await testServerConnection(origin, 4000);
  if (!result.ok) return null;
  return {
    url: normalizeServerUrl(origin),
    label,
    needsSetup: result.needsSetup,
    source,
  } satisfies DiscoveredServer;
}

function addSubnetScanCandidates(
  candidates: { origin: string; source: DiscoveredServer["source"]; label: string }[],
  subnet: string,
) {
  for (let host = 1; host <= 64; host++) {
    candidates.push({
      origin: `http://${subnet}.${host}:4600`,
      source: "scan",
      label: `${subnet}.${host}`,
    });
  }
}

/** Best-effort LAN / Tailscale / Chromebook Linux discovery. */
export async function discoverNearbyServers(onProgress?: (msg: string) => void): Promise<DiscoveredServer[]> {
  const snap = readSnapshot();
  const found = new Map<string, DiscoveredServer>();
  const candidates: { origin: string; source: DiscoveredServer["source"]; label: string }[] = [];
  const seenOrigins = new Set<string>();

  const pushCandidate = (origin: string, source: DiscoveredServer["source"], label: string) => {
    const key = origin.toLowerCase();
    if (seenOrigins.has(key)) return;
    seenOrigins.add(key);
    candidates.push({ origin, source, label });
  };

  for (const profile of snap.profiles) {
    pushCandidate(profile.url, "scan", profile.name);
  }

  // Chrome OS Linux VM bridge (Android app → Linux backend on same Chromebook)
  if (isChromeOsDevice()) {
    pushCandidate("http://100.115.92.2:4600", "linux-bridge", "This Chromebook (Linux)");
  }

  onProgress?.("Detecting Wi‑Fi network…");
  const deviceSubnet = await detectDeviceWifiSubnet();
  const scanSubnet = snap.scanSubnet ?? deviceSubnet;

  if (deviceSubnet && !snap.scanSubnet) {
    writeSnapshot({ ...snap, scanSubnet: deviceSubnet });
  }

  if (scanSubnet) {
    onProgress?.(`Scanning ${scanSubnet}.x…`);
    addSubnetScanCandidates(candidates, scanSubnet);
  } else {
    onProgress?.("Scanning common home networks…");
    for (const subnet of ["10.0.0", "192.168.1", "192.168.0"]) {
      for (const host of [1, 2, 10, 12, 20, 47, 100]) {
        pushCandidate(`http://${subnet}.${host}:4600`, "scan", `${subnet}.${host}`);
      }
    }
  }

  const batchSize = 8;
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((c) => probeOrigin(c.origin, c.source, c.label)),
    );
    for (const hit of results) {
      if (hit) found.set(hit.url, hit);
    }
  }

  return [...found.values()];
}

export function reloadForServerSwitch(): void {
  window.location.reload();
}
