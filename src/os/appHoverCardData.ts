/**
 * Stub menu data for the shell app hovercard (port of Longformer tray-menu-data).
 * Profiles are UI-only for now — wire to real workspaces/accounts later.
 */

export interface AppHoverProfile {
  id: string;
  label: string;
}

export interface AppHoverCardActionHandlers {
  onNewWindow?: () => void;
  onNewPrivateWindow?: () => void;
  onShowAllWindows?: () => void;
  onHide?: () => void;
  onQuit?: () => void;
  onSelectProfile?: (profileId: string) => void;
  onRemove?: () => void;
}

/** STUB: replace with real account/workspace profiles when available. */
export function defaultProfilesForApp(appId: string): AppHoverProfile[] {
  const bare = appId.includes(":") ? appId.slice(appId.indexOf(":") + 1) : appId;

  if (bare === "chat" || bare === "longformer") {
    return [
      { id: "all-hands", label: "all-hands.dev" },
      { id: "doctransit", label: "DocTransit" },
      { id: "moon", label: "Moon" },
      { id: "alex", label: "Alex" },
      { id: "alex-dev", label: "alex-dev" },
    ];
  }

  return [
    { id: "default", label: "Default" },
    { id: "work", label: "Work" },
    { id: "personal", label: "Personal" },
  ];
}

export const APP_HOVER_OPTIONS_ITEMS = [
  { id: "preferences", label: "Preferences…" },
  { id: "updates", label: "Check for Updates" },
  { id: "open-login", label: "Open at Login" },
] as const;
