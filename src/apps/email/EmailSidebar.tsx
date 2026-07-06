import { Archive, Inbox, Send, Trash2 } from "lucide-react";
import { NavSidebar, SidebarUserFooter } from "../../components/patterns";
import type { MailFolder } from "./types";

function folderIcon(icon: MailFolder["icon"]) {
  const props = { size: 15, strokeWidth: 1.75 as const };
  switch (icon) {
    case "send":
      return <Send {...props} />;
    case "archive":
      return <Archive {...props} />;
    case "trash":
      return <Trash2 {...props} />;
    default:
      return <Inbox {...props} />;
  }
}

export function EmailSidebar({
  folders,
  userName,
  userEmail,
  onSelectFolder,
}: {
  folders: (MailFolder & { active?: boolean })[];
  userName: string;
  userEmail: string;
  onSelectFolder: (id: string) => void;
}) {
  return (
    <NavSidebar
      sections={[
        {
          id: "mailboxes",
          title: "Mailboxes",
          items: folders.map((folder) => ({
            id: folder.id,
            label: folder.label,
            leading: folderIcon(folder.icon),
            active: folder.active,
            onClick: () => onSelectFolder(folder.id),
          })),
        },
      ]}
      footer={<SidebarUserFooter name={userName} meta={userEmail} />}
    />
  );
}
