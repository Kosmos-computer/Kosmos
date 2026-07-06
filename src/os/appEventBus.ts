/**
 * Client-side fan-out for platform event topics (the composerBus CustomEvent
 * pattern). handleShellEvent publishes every `app_event` here; each open
 * AppHost subscribes and forwards topics its app's manifest declared. Keeps
 * osActions decoupled from window surfaces.
 */
const EVENT_NAME = "arco:app-event";

export interface AppEventDetail {
  topic: string;
}

export function publishAppEvent(detail: AppEventDetail): void {
  window.dispatchEvent(new CustomEvent<AppEventDetail>(EVENT_NAME, { detail }));
}

export function onAppEvent(handler: (detail: AppEventDetail) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<AppEventDetail>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
