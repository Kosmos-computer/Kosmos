import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Bookmark,
  ChevronDown,
  Hash,
  Home,
  List,
  MessageCircle,
  Newspaper,
  PenSquare,
  Settings,
  Unplug,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Menu, type MenuItem } from "../../components/Menu";
import { Avatar } from "../../components/ui";
import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
import { SocialNetworkIcon } from "./SocialNetworkIcon";
import type { SocialNetworkId } from "./types";

export type SocialNavId =
  | "new-post"
  | "home"
  | "explore"
  | "notifications"
  | "chat"
  | "feeds"
  | "lists"
  | "saved"
  | "profile"
  | "settings";

export interface SocialNavItem {
  id: SocialNavId;
  labelKey: I18nKey;
  Icon: LucideIcon;
  /** Primary compose action — not a destination. */
  action?: "compose";
}

export const SOCIAL_NAV_ITEMS: SocialNavItem[] = [
  { id: "new-post", labelKey: I18nKey.APPS$SOCIAL_NAV_NEW_POST, Icon: PenSquare, action: "compose" },
  { id: "home", labelKey: I18nKey.APPS$SOCIAL_NAV_HOME, Icon: Home },
  { id: "explore", labelKey: I18nKey.APPS$SOCIAL_NAV_EXPLORE, Icon: Hash },
  { id: "notifications", labelKey: I18nKey.APPS$SOCIAL_NAV_NOTIFICATIONS, Icon: Bell },
  { id: "chat", labelKey: I18nKey.APPS$SOCIAL_NAV_CHAT, Icon: MessageCircle },
  { id: "feeds", labelKey: I18nKey.APPS$SOCIAL_NAV_FEEDS, Icon: Newspaper },
  { id: "lists", labelKey: I18nKey.APPS$SOCIAL_NAV_LISTS, Icon: List },
  { id: "saved", labelKey: I18nKey.APPS$SOCIAL_NAV_SAVED, Icon: Bookmark },
  { id: "profile", labelKey: I18nKey.APPS$SOCIAL_NAV_PROFILE, Icon: User },
  { id: "settings", labelKey: I18nKey.APPS$SOCIAL_NAV_SETTINGS, Icon: Settings },
];

function networkLabel(network: SocialNetworkId): string {
  if (network === "mastodon") return "Mastodon";
  if (network === "nostr") return "Nostr";
  if (network === "twitter") return "X";
  if (network === "facebook") return "Facebook";
  if (network === "reddit") return "Reddit";
  return "Bluesky";
}

export interface SocialNavProps {
  activeId: SocialNavId;
  onSelect: (id: SocialNavId) => void;
  displayName?: string;
  handle?: string;
  avatar?: string;
  network?: SocialNetworkId;
  accent?: string;
  onDisconnect?: () => void;
}

export function SocialNav({
  activeId,
  onSelect,
  displayName,
  handle,
  avatar,
  network = "bluesky",
  accent = "#0085ff",
  onDisconnect,
}: SocialNavProps) {
  const { t } = useTranslation();
  const brand = networkLabel(network);
  const profileName = displayName?.trim() || handle || brand;

  const menuItems: MenuItem[] = [
    {
      id: "settings",
      label: <T k={I18nKey.APPS$SOCIAL_NAV_SETTINGS} />,
      icon: Settings,
      onSelect: () => onSelect("settings"),
    },
    {
      id: "disconnect",
      label: <T k={I18nKey.APPS$SOCIAL_DISCONNECT} />,
      icon: Unplug,
      danger: true,
      separatorAbove: true,
      onSelect: onDisconnect,
    },
  ];

  return (
    <aside className="arco-social__nav" aria-label={t(I18nKey.APPS$SOCIAL_NAV)}>
      <div className="arco-social__nav-brand">
        <Menu
          className="arco-social__nav-brand-menu"
          side="bottom"
          align="start"
          searchable={false}
          aria-label={profileName}
          items={menuItems}
          trigger={
            <button
              type="button"
              className="arco-social__nav-brand-trigger"
              style={{ ["--social-accent" as string]: accent }}
            >
              <span className="arco-social__nav-brand-avatar-wrap">
                <Avatar
                  name={profileName}
                  src={avatar}
                  size="md"
                  className="arco-social__nav-brand-avatar"
                />
                <span className="arco-social__nav-brand-badge" aria-hidden="true">
                  <SocialNetworkIcon network={network} size={10} />
                </span>
              </span>
              <span className="arco-social__nav-brand-meta">
                <strong>{profileName}</strong>
                {/* eslint-disable-next-line i18next/no-literal-string -- network brand */}
                <small>{brand}</small>
              </span>
              <ChevronDown size={14} className="arco-social__nav-brand-chevron" aria-hidden />
            </button>
          }
        />
      </div>
      <nav className="arco-social__nav-list">
        {SOCIAL_NAV_ITEMS.map((item) => {
          const isCompose = item.action === "compose";
          const active = !isCompose && activeId === item.id;
          const label = t(item.labelKey);
          return (
            <button
              key={item.id}
              type="button"
              className={`arco-social__nav-item${active ? " arco-social__nav-item--active" : ""}${isCompose ? " arco-social__nav-item--compose" : ""}`}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              title={label}
              onClick={() => onSelect(item.id)}
            >
              <item.Icon size={20} aria-hidden />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
