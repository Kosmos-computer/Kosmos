/**
 * Generated-app icon names — shared between server (assignment) and client
 * (rendering). Lucide kebab-case names; the client maps them to components.
 */

/** Icons the shell can render. Keep in sync with `src/apps/appview/appIcon.ts`. */
export const APP_ICON_NAMES = [
  "bar-chart-3",
  "book-heart",
  "calendar",
  "calendar-days",
  "camera",
  "clock",
  "cloud-sun",
  "coffee",
  "dumbbell",
  "file-text",
  "flask-conical",
  "folder",
  "gamepad-2",
  "hard-drive",
  "heart",
  "home",
  "image",
  "layout",
  "lightbulb",
  "list-todo",
  "mail",
  "map",
  "map-pin",
  "music",
  "palette",
  "pencil",
  "plane",
  "presentation",
  "rocket",
  "search",
  "shopping-cart",
  "star",
  "sticky-note",
  "sun",
  "table",
  "target",
  "timer",
  "trophy",
  "users",
  "utensils",
  "video",
  "wallet",
  "wrench",
] as const;

export type AppIconName = (typeof APP_ICON_NAMES)[number];

const ICON_SET = new Set<string>(APP_ICON_NAMES);

const TITLE_RULES: { pattern: RegExp; icon: AppIconName }[] = [
  { pattern: /\b(todos?|tasks?|checklists?)\b/i, icon: "list-todo" },
  { pattern: /\b(notes?|memos?|journals?|diary|diaries)\b/i, icon: "sticky-note" },
  { pattern: /\b(weather|forecast|climate)\b/i, icon: "cloud-sun" },
  { pattern: /\b(clocks?|timers?|alarms?)\b/i, icon: "clock" },
  { pattern: /\b(calendar|schedules?|events?)\b/i, icon: "calendar-days" },
  { pattern: /\b(restaurants?|foods?|dining|recipes?|cook(?:ing)?)\b/i, icon: "utensils" },
  { pattern: /\b(games?|shooters?|arcades?|play)\b/i, icon: "gamepad-2" },
  { pattern: /\b(money|finances?|budgets?|wallets?|banks?)\b/i, icon: "wallet" },
  { pattern: /\b(dates?|dating|loves?|romance)\b/i, icon: "heart" },
  { pattern: /\b(maps?|locations?|travel|cities|finders?)\b/i, icon: "map-pin" },
  { pattern: /\b(charts?|dashboards?|analytics|metrics?|stats?)\b/i, icon: "bar-chart-3" },
  { pattern: /\b(photos?|cameras?|galleries?|images?)\b/i, icon: "camera" },
  { pattern: /\b(music|audio|playlists?|songs?)\b/i, icon: "music" },
  { pattern: /\b(fitness|workouts?|gyms?|exercises?)\b/i, icon: "dumbbell" },
  { pattern: /\b(demos?|labs?|experiments?|prototypes?)\b/i, icon: "flask-conical" },
  { pattern: /\b(nav|layouts?|sidebars?|shells?)\b/i, icon: "layout" },
  { pattern: /\b(docs?|documents?|writes?|editors?)\b/i, icon: "file-text" },
  { pattern: /\b(mails?|emails?|inboxes?)\b/i, icon: "mail" },
  { pattern: /\b(shops?|stores?|carts?|buy(?:ing)?)\b/i, icon: "shopping-cart" },
  { pattern: /\b(homes?|houses?)\b/i, icon: "home" },
  { pattern: /\b(search(?:ing)?|find(?:ing)?|lookups?)\b/i, icon: "search" },
  { pattern: /\b(teams?|people|social|chats?)\b/i, icon: "users" },
  { pattern: /\b(videos?|movies?|films?|streams?)\b/i, icon: "video" },
  { pattern: /\b(ideas?|brainstorms?|light(?:bulb)?)\b/i, icon: "lightbulb" },
  { pattern: /\b(arts?|designs?|colors?|paints?)\b/i, icon: "palette" },
  { pattern: /\b(flights?|planes?|airports?)\b/i, icon: "plane" },
  { pattern: /\b(rockets?|launches?|space)\b/i, icon: "rocket" },
  { pattern: /\b(presentations?|slides?|decks?)\b/i, icon: "presentation" },
  { pattern: /\b(tables?|spreadsheets?|grids?)\b/i, icon: "table" },
  { pattern: /\b(folders?|drives?|files?)\b/i, icon: "folder" },
  { pattern: /\b(goals?|targets?|focus)\b/i, icon: "target" },
  { pattern: /\b(wins?|trophies?|scores?|leaderboards?)\b/i, icon: "trophy" },
  { pattern: /\b(stars?|favorites?|bookmarks?)\b/i, icon: "star" },
  { pattern: /\b(suns?|days?|mornings?)\b/i, icon: "sun" },
  { pattern: /\b(coffee|breaks?|morning routines?)\b/i, icon: "coffee" },
  { pattern: /\b(tools?|fix(?:es|ing)?|repairs?|build(?:ing)?)\b/i, icon: "wrench" },
  { pattern: /\b(pencils?|sketches?|draw(?:ing)?)\b/i, icon: "pencil" },
  { pattern: /\b(books?|reads?|stories?)\b/i, icon: "book-heart" },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function isAppIconName(name: string | undefined): name is AppIconName {
  return !!name && ICON_SET.has(name);
}

/** Pick a stable, diverse icon from title keywords, then id/title hash. */
export function pickAppIcon(title: string, id?: string): AppIconName {
  const normalized = title.trim();
  for (const rule of TITLE_RULES) {
    if (rule.pattern.test(normalized)) return rule.icon;
  }
  const seed = id ?? (normalized || "app");
  return APP_ICON_NAMES[hashString(seed) % APP_ICON_NAMES.length];
}
