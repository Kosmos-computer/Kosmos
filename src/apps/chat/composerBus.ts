/**
 * primeComposer — the openclaw-os CustomEvent pattern: any surface (an app's
 * Refine button, a follow-up chip, the Apps library) can seed the global chat
 * composer and optionally submit. Keeps surfaces decoupled from ChatApp.
 */
import { setPendingTurnContext, type ClientBuildMode } from "./turnContext";

export interface PrimeComposerDetail {
  text: string;
  submit: boolean;
  /** Structured refine target — preferred over parsing free text. */
  linkedAppId?: string;
  buildMode?: ClientBuildMode;
}

const EVENT_NAME = "arco:prime-composer";

export function primeComposer(detail: PrimeComposerDetail): void {
  if (detail.linkedAppId || detail.buildMode) {
    setPendingTurnContext({
      ...(detail.linkedAppId ? { linkedAppId: detail.linkedAppId } : {}),
      ...(detail.buildMode ? { buildMode: detail.buildMode } : {}),
    });
  }
  window.dispatchEvent(new CustomEvent<PrimeComposerDetail>(EVENT_NAME, { detail }));
}

export function onPrimeComposer(handler: (detail: PrimeComposerDetail) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<PrimeComposerDetail>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
