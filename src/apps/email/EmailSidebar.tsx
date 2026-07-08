import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
import { Archive, Inbox, LogOut, Plug, Send, Trash2 } from "lucide-react";
import { Button } from "../../components/ui";
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
  isConnected,
  oauthConfigured,
  onConnect,
  onDisconnect,
}: {
  folders: (MailFolder & { active?: boolean })[];
  userName: string;
  userEmail: string;
  onSelectFolder: (id: string) => void;
  isConnected: boolean;
  oauthConfigured: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
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
            disabled: !isConnected,
          })),
        },
      ]}
      footer={
        <div className="arco-email__sidebar-footer">
          {isConnected ? (
            <Button variant="ghost" onClick={onDisconnect} className="arco-email__disconnect">
              <LogOut size={14} /><T k={I18nKey.COMMON$DISCONNECT} /></Button>
          ) : (
            <Button variant="primary" onClick={onConnect} disabled={!oauthConfigured} className="arco-email__connect-btn">
              <Plug size={14} /><T k={I18nKey.APPS$EMAIL_CONNECT_GMAIL} /></Button>
          )}
          <SidebarUserFooter name={userName} meta={userEmail} />
        </div>
      }
    />
  );
}
