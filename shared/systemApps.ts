/**
 * System app catalog — ids and display titles for shell apps. Keep in sync
 * with src/os/systemApps.tsx (icons/components stay client-side).
 */
export interface SystemAppCatalogEntry {
  id: string;
  title: string;
}

/** Every built-in shell app the agent can open. */
export const SYSTEM_APP_CATALOG: SystemAppCatalogEntry[] = [
  { id: "chat", title: "Chat" },
  { id: "studio", title: "Agent Studio" },
  { id: "apps", title: "Apps" },
  { id: "skills", title: "Skills" },
  { id: "memory", title: "Memory" },
  { id: "keywallet", title: "Key Wallet" },
  { id: "apis", title: "APIs" },
  { id: "automations", title: "Automations" },
  { id: "files", title: "Drive" },
  { id: "maps", title: "Maps" },
  { id: "search", title: "Search" },
  { id: "longformer", title: "Longformer" },
  { id: "kamiji", title: "Kamiji" },
  { id: "music", title: "Music" },
  { id: "video", title: "Video" },
  { id: "meet", title: "Meet" },
  { id: "podcast", title: "Podcasts" },
  { id: "downloads", title: "Downloads" },
  { id: "pay", title: "Pay" },
  { id: "notes", title: "Notes" },
  { id: "email", title: "Email" },
  { id: "calendar", title: "Calendar" },
  { id: "tasks", title: "Tasks" },
  { id: "contacts", title: "Contacts" },
  { id: "groups", title: "Groups" },
  { id: "messenger", title: "Messenger" },
  { id: "social", title: "Social" },
  { id: "sheets", title: "Sheets" },
  { id: "generator", title: "Generator" },
  { id: "imagegen", title: "Image Gen" },
  { id: "terminal", title: "Terminal" },
  { id: "settings", title: "Settings" },
  { id: "startup", title: "Setup" },
  { id: "onboarding", title: "Onboarding" },
];

function normalizeAppQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Strip a trailing "s" so "podcasts" resolves to id "podcast". */
function singularizeToken(token: string): string {
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
}

function queryVariants(raw: string): string[] {
  const lower = normalizeAppQuery(raw);
  const tail = lower.split(".").pop() ?? lower;
  const variants = new Set([lower, tail, singularizeToken(lower), singularizeToken(tail)]);
  return [...variants];
}

/**
 * Map a user/model app name onto a system app id. Accepts ids ("podcast"),
 * titles ("Podcasts"), qualified ids ("core.settings" → "settings"), and
 * common plural forms ("podcasts").
 */
export function resolveSystemAppId(raw: string): string | undefined {
  const variants = queryVariants(raw);

  for (const variant of variants) {
    const byId = SYSTEM_APP_CATALOG.find((entry) => entry.id === variant);
    if (byId) return byId.id;
  }

  for (const variant of variants) {
    const byTitle = SYSTEM_APP_CATALOG.find((entry) => entry.title.toLowerCase() === variant);
    if (byTitle) return byTitle.id;
  }

  const lower = normalizeAppQuery(raw);
  const byTitleIncludes = SYSTEM_APP_CATALOG.find(
    (entry) =>
      entry.title.toLowerCase().includes(lower) ||
      lower.includes(entry.title.toLowerCase()) ||
      lower.includes(entry.id),
  );
  return byTitleIncludes?.id;
}
