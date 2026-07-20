import { useMemo, useState } from "react";
import { ChevronUp, Cloud, HardDrive, Server } from "lucide-react";
import { Menu, type MenuItem } from "../../components/Menu";
import { desktopUsesCloudProfile } from "../../os/server/cloudShellMode";
import {
  getActiveServerProfile,
  listServerProfiles,
} from "../../os/server/serverProfileStore";
import type { ServerProfile } from "../../os/server/serverProfileTypes";
import {
  LOCAL_NOTES_BACKEND_ID,
  notesBackendIdForServerProfile,
  serverProfileIdFromNotesBackend,
} from "./notesMock";

function hostLabel(host: string): string {
  return host.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function profileDisplayName(profile: ServerProfile): string {
  if (profile.kind === "cloud") return profile.name?.trim() || "Kosmos Cloud";
  return profile.name?.trim() || hostLabel(profile.url);
}

function connectedServerProfiles(): ServerProfile[] {
  const active = getActiveServerProfile();
  const profiles = listServerProfiles().filter((profile) => {
    if (profile.kind === "cloud") return true;
    return active?.id === profile.id;
  });
  if (active && !profiles.some((profile) => profile.id === active.id)) {
    return [active, ...profiles];
  }
  return profiles;
}

export function NotesBackendFooter({
  activeBackendId,
  onSwitchBackend,
}: {
  activeBackendId: string;
  onSwitchBackend: (backendId: string, backendName?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const serverProfiles = useMemo(() => connectedServerProfiles(), [open]);
  const cloudConnected = desktopUsesCloudProfile() || getActiveServerProfile()?.kind === "cloud";

  const activeServerProfileId = serverProfileIdFromNotesBackend(activeBackendId);
  const activeServerProfile =
    (activeServerProfileId
      ? serverProfiles.find((profile) => profile.id === activeServerProfileId) ??
        listServerProfiles().find((profile) => profile.id === activeServerProfileId)
      : null) ?? null;

  const activeName =
    activeBackendId === LOCAL_NOTES_BACKEND_ID
      ? "Local"
      : activeServerProfile
        ? profileDisplayName(activeServerProfile)
        : "Backend";

  const activeMeta =
    activeBackendId === LOCAL_NOTES_BACKEND_ID
      ? "This machine · Synced via Drive"
      : activeServerProfile
        ? `${activeServerProfile.kind === "cloud" ? "Kosmos Cloud" : "Server"} · ${hostLabel(activeServerProfile.url)}`
        : "Notes";

  const ActiveIcon =
    activeBackendId === LOCAL_NOTES_BACKEND_ID
      ? HardDrive
      : activeServerProfile?.kind === "cloud"
        ? Cloud
        : Server;

  const items = useMemo<MenuItem[]>(() => {
    const localItem: MenuItem = {
      id: LOCAL_NOTES_BACKEND_ID,
      label: "Local",
      description: "This machine · Drive Notes folder",
      icon: HardDrive,
      checked: activeBackendId === LOCAL_NOTES_BACKEND_ID,
      onSelect: () => onSwitchBackend(LOCAL_NOTES_BACKEND_ID, "Local"),
    };

    if (serverProfiles.length === 0) {
      return [
        localItem,
        {
          id: "empty",
          label: cloudConnected ? "No saved cloud profile" : "No Kosmos Cloud connection",
          description: "Connect in Settings → Kosmos Cloud",
          disabled: true,
          separatorAbove: true,
        },
      ];
    }

    const serverItems: MenuItem[] = serverProfiles.map((profile) => {
      const backendId = notesBackendIdForServerProfile(profile.id);
      const name = profileDisplayName(profile);
      return {
        id: backendId,
        label: name,
        description:
          profile.kind === "cloud"
            ? `Kosmos Cloud · ${hostLabel(profile.url)} · Drive sync`
            : `Server · ${hostLabel(profile.url)} · Drive sync`,
        icon: profile.kind === "cloud" ? Cloud : Server,
        checked: activeBackendId === backendId,
        onSelect: () => onSwitchBackend(backendId, name),
      };
    });

    return [localItem, ...serverItems];
  }, [activeBackendId, cloudConnected, onSwitchBackend, serverProfiles]);

  return (
    <Menu
      className="arco-notes-backend-menu"
      aria-label="Switch notes backend"
      side="top"
      align="start"
      portal
      heading="Notes vault"
      open={open}
      onOpenChange={setOpen}
      items={items}
      trigger={
        <button
          type="button"
          className="arco-nav-sidebar__user-footer"
          aria-label={`Notes vault: ${activeName}`}
          aria-haspopup="menu"
        >
          <span className="arco-notes-backend-menu__icon" aria-hidden="true">
            <ActiveIcon size={18} strokeWidth={1.75} />
          </span>
          <span className="arco-nav-sidebar__user-body">
            <span className="arco-nav-sidebar__user-name">{activeName}</span>
            <span className="arco-nav-sidebar__user-meta">{activeMeta}</span>
          </span>
          <ChevronUp size={14} className="arco-notes-backend-menu__chevron" aria-hidden="true" />
        </button>
      }
    />
  );
}
