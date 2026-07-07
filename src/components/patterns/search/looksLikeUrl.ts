/** True when the user input should navigate instead of running a web search. */
export function looksLikeUrl(input: string): boolean {
  const t = input.trim();
  if (!t) return false;
  if (/^\d+$/.test(t)) return true;
  if (/^https?:\/\//i.test(t)) return true;
  if (/^localhost(?::\d+)?(?:\/.*)?$/i.test(t)) return true;
  if (/^[\w-]+(\.[\w-]+)+(?:[/:?#]|$)/.test(t)) return true;
  if (/^[\w-]+\.(com|org|net|io|dev|app|co|edu|gov)(?:[/:?#]|$)/i.test(t)) return true;
  return false;
}
