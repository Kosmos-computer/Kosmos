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
  LOCAL_CONTACTS_BACKEND_ID,
  contactsBackendIdForServerProfile,
  serverProfileIdFromContactsBackend,
} from "./contactsMock";

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

export function ContactsBackendFooter({
  activeBackendId,
  onSwitchBackend,
}: {
  activeBackendId: string;
  onSwitchBackend: (backendId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const serverProfiles = useMemo(() => connectedServerProfiles(), [open]);
  const cloudConnected = desktopUsesCloudProfile() || getActiveServerProfile()?.kind === "cloud";

  const activeServerProfileId = serverProfileIdFromContactsBackend(activeBackendId);
  const activeServerProfile =
    (activeServerProfileId
      ? serverProfiles.find((profile) => profile.id === activeServerProfileId) ??
        listServerProfiles().find((profile) => profile.id === activeServerProfileId)
      : null) ?? null;

  const activeName =
    activeBackendId === LOCAL_CONTACTS_BACKEND_ID
      ? "Local"
      : activeServerProfile
        ? profileDisplayName(activeServerProfile)
        : "Backend";

  const activeMeta =
    activeBackendId === LOCAL_CONTACTS_BACKEND_ID
      ? "This machine · On device"
      : activeServerProfile
        ? `${activeServerProfile.kind === "cloud" ? "Kosmos Cloud" : "Server"} · ${hostLabel(activeServerProfile.url)}`
        : "Contacts";

  const ActiveIcon =
    activeBackendId === LOCAL_CONTACTS_BACKEND_ID
      ? HardDrive
      : activeServerProfile?.kind === "cloud"
        ? Cloud
        : Server;

  const items = useMemo<MenuItem[]>(() => {
    const localItem: MenuItem = {
      id: LOCAL_CONTACTS_BACKEND_ID,
      label: "Local",
      description: "This machine · On-device contacts",
      icon: HardDrive,
      checked: activeBackendId === LOCAL_CONTACTS_BACKEND_ID,
      onSelect: () => onSwitchBackend(LOCAL_CONTACTS_BACKEND_ID),
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
      const backendId = contactsBackendIdForServerProfile(profile.id);
      const name = profileDisplayName(profile);
      return {
        id: backendId,
        label: name,
        description:
          profile.kind === "cloud"
            ? `Kosmos Cloud · ${hostLabel(profile.url)}`
            : `Server · ${hostLabel(profile.url)}`,
        icon: profile.kind === "cloud" ? Cloud : Server,
        checked: activeBackendId === backendId,
        onSelect: () => onSwitchBackend(backendId),
      };
    });

    return [localItem, ...serverItems];
  }, [activeBackendId, cloudConnected, onSwitchBackend, serverProfiles]);

  return (
    <Menu
      className="arco-contacts-backend-menu"
      aria-label="Switch contacts backend"
      side="top"
      align="start"
      portal
      heading="Contacts vault"
      open={open}
      onOpenChange={setOpen}
      items={items}
      trigger={
        <button
          type="button"
          className="arco-nav-sidebar__user-footer"
          aria-label={`Contacts vault: ${activeName}`}
          aria-haspopup="menu"
        >
          <span className="arco-contacts-backend-menu__icon" aria-hidden="true">
            <ActiveIcon size={18} strokeWidth={1.75} />
          </span>
          <span className="arco-nav-sidebar__user-body">
            <span className="arco-nav-sidebar__user-name">{activeName}</span>
            <span className="arco-nav-sidebar__user-meta">{activeMeta}</span>
          </span>
          <ChevronUp size={14} className="arco-contacts-backend-menu__chevron" aria-hidden="true" />
        </button>
      }
    />
  );
}
