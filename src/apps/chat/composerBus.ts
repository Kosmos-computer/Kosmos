/**
 * primeComposer — the openclaw-os CustomEvent pattern: any surface (an app's
 * Refine button, a follow-up chip, the Apps library) can seed the global chat
 * composer and optionally submit. Keeps surfaces decoupled from ChatApp.
 */
export interface PrimeComposerDetail {
  text: string;
  submit: boolean;
}

const EVENT_NAME = "arco:prime-composer";

export function primeComposer(detail: PrimeComposerDetail): void {
  window.dispatchEvent(new CustomEvent<PrimeComposerDetail>(EVENT_NAME, { detail }));
}

export function onPrimeComposer(handler: (detail: PrimeComposerDetail) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<PrimeComposerDetail>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
