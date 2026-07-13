/**
 * Iframe UI bridge — AppHost registers a drive handler per installed-app
 * window so the agent cursor can snapshot/click/type inside sandboxed apps
 * via postMessage (path #2). Same-document React apps stay path #3.
 */
export interface GuestUiElement {
  id: string;
  role: string;
  label: string;
  rect: { x: number; y: number; w: number; h: number };
  disabled?: boolean;
  value?: string;
}

export interface GuestUiSnapshot {
  elements: GuestUiElement[];
}

export type GuestUiCommand =
  | { kind: "snapshot" }
  | { kind: "click"; targetId: string }
  | { kind: "type"; targetId: string; text: string; submit?: boolean }
  | { kind: "select"; targetId: string; value: string };

export type IframeUiDriver = (command: GuestUiCommand) => Promise<GuestUiSnapshot | { ok: true } | { error: string }>;

const drivers = new Map<string, IframeUiDriver>();

/** Register when an AppHost iframe is live; key is windowStore id (installed:…). */
export function registerIframeUiDriver(windowId: string, driver: IframeUiDriver): void {
  drivers.set(windowId, driver);
}

export function unregisterIframeUiDriver(windowId: string): void {
  drivers.delete(windowId);
}

export function getIframeUiDriver(windowId: string): IframeUiDriver | undefined {
  return drivers.get(windowId);
}

export function listIframeUiWindowIds(): string[] {
  return [...drivers.keys()];
}

/** Prefixed element ids: g:<windowId>:<localCid> so clicks route back to the guest. */
export function guestElementId(windowId: string, localId: string): string {
  return `g:${windowId}:${localId}`;
}

export function parseGuestElementId(
  targetId: string,
): { windowId: string; localId: string } | null {
  if (!targetId.startsWith("g:")) return null;
  const rest = targetId.slice(2);
  const lastColon = rest.lastIndexOf(":");
  if (lastColon <= 0) return null;
  const windowId = rest.slice(0, lastColon);
  const localId = rest.slice(lastColon + 1);
  if (!windowId || !localId) return null;
  return { windowId, localId };
}
