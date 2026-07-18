/**
 * Fan-out when the agent registry changes so composer chips and other
 * surfaces refetch without sharing React state across windows.
 */
const EVENT_NAME = "arco:agents-changed";

export function notifyAgentsChanged(): void {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function onAgentsChanged(handler: () => void): () => void {
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
