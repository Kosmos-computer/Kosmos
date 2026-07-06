import {
  Clock,
  Folder,
  Globe,
  Home,
  Star,
  Trash2,
} from "lucide-react";
import { DriveNewMenu } from "./DriveNewMenu";
import { NavSidebar } from "../../components/patterns";
import type { DriveNewItemType, FilesLocation } from "./types";

const LOCATIONS: { id: FilesLocation; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "drive", label: "My Drive", icon: Folder },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "starred", label: "Starred", icon: Star },
  { id: "trash", label: "Trash", icon: Trash2 },
];

export interface FilesSidebarProps {
  location: FilesLocation;
  onLocationChange: (location: FilesLocation) => void;
  onCreateNew?: (type: DriveNewItemType) => void;
  storageUsedLabel?: string;
  storageTotalLabel?: string;
}

export function FilesSidebar({
  location,
  onLocationChange,
  onCreateNew,
  storageUsedLabel = "—",
  storageTotalLabel = "100 GB",
}: FilesSidebarProps) {
  const usedPercent = 0;

  return (
    <NavSidebar
      className="arco-drive-sidebar"
      primarySlot={onCreateNew ? <DriveNewMenu onCreate={onCreateNew} /> : undefined}
      sections={[
        {
          id: "locations",
          items: LOCATIONS.map((item) => {
            const Icon = item.icon;
            return {
              id: item.id,
              label: item.label,
              leading: <Icon size={15} strokeWidth={1.75} />,
              active: location === item.id,
              onClick: () => onLocationChange(item.id),
            };
          }),
        },
      ]}
      footer={
        <div className="arco-drive-sidebar__storage">
          <div className="arco-drive-sidebar__storage-label">
            <Globe size={14} strokeWidth={1.75} />
            Storage
          </div>
          <div className="arco-drive-sidebar__storage-meter" aria-hidden="true">
            <span className="arco-drive-sidebar__storage-fill" style={{ width: `${usedPercent}%` }} />
          </div>
          <div className="arco-drive-sidebar__storage-meta">
            {storageUsedLabel} of {storageTotalLabel} used
          </div>
        </div>
      }
    />
  );
}
