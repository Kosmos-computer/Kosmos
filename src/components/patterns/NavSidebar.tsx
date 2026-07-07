import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ListItem } from "./ListItem";

export interface NavSidebarQuickLink {
  id: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
}

export interface NavSidebarListItem {
  id: string;
  label: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export interface NavSidebarSection {
  id: string;
  title?: string;
  items?: NavSidebarListItem[];
}

export interface NavSidebarProps {
  header?: ReactNode;
  /** Replaces the default primary button when set (e.g. a dropdown menu). */
  primarySlot?: ReactNode;
  primaryAction?: { label: string; icon?: LucideIcon; onClick?: () => void };
  quickLinks?: NavSidebarQuickLink[];
  sections: NavSidebarSection[];
  /** When set, replaces the default section list in the scroll area. */
  scrollContent?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function NavSidebarSectionHeader({ title }: { title?: string }) {
  if (!title) return null;
  return (
    <div className="arco-nav-sidebar__section-header">
      <span className="arco-nav-sidebar__section-title">{title}</span>
    </div>
  );
}

/** Workspace sidebar — primary action, quick links, grouped sections, footer. */
export function NavSidebar({
  header,
  primarySlot,
  primaryAction,
  quickLinks,
  sections,
  scrollContent,
  footer,
  className = "",
}: NavSidebarProps) {
  const PrimaryIcon = primaryAction?.icon;
  return (
    <div className={["arco-nav-sidebar", className].filter(Boolean).join(" ")}>
      {header ? <div className="arco-nav-sidebar__header-slot">{header}</div> : null}

      {(primarySlot || primaryAction || quickLinks) && (
        <div className="arco-nav-sidebar__header">
          {primarySlot ? (
            primarySlot
          ) : primaryAction ? (
            <button type="button" className="arco-btn arco-nav-sidebar__primary" onClick={primaryAction.onClick}>
              {PrimaryIcon ? <PrimaryIcon size={15} strokeWidth={1.75} /> : null}
              {primaryAction.label}
            </button>
          ) : null}
          {quickLinks && quickLinks.length > 0 ? (
            <div className="arco-nav-sidebar__quick-links">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <ListItem
                    key={link.id}
                    className="arco-nav-sidebar__nav-item"
                    leading={<Icon size={15} strokeWidth={1.75} />}
                    label={link.label}
                    active={link.active}
                    onClick={link.onClick}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      <div className="arco-nav-sidebar__scroll arco-scroll">
        {scrollContent ?? (
          <div className="arco-nav-sidebar__sections">
            {sections.map((section) => (
              <div key={section.id}>
                <NavSidebarSectionHeader title={section.title} />
                <div className="arco-nav-sidebar__section-items">
                  {section.items?.map((item) => (
                    <ListItem
                      key={item.id}
                      className="arco-nav-sidebar__nav-item"
                      leading={item.leading}
                      label={item.label}
                      trailing={item.trailing}
                      active={item.active}
                      disabled={item.disabled}
                      onClick={item.onClick}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {footer ? <div className="arco-nav-sidebar__footer">{footer}</div> : null}
    </div>
  );
}

export interface SidebarUserFooterProps {
  name: string;
  meta?: string;
  onClick?: () => void;
}

export function SidebarUserFooter({ name, meta, onClick }: SidebarUserFooterProps) {
  return (
    <button type="button" className="arco-nav-sidebar__user-footer" onClick={onClick}>
      <span className="arco-avatar arco-avatar--md" role="img" aria-label={name}>
        {name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? "")
          .join("")}
        <span className="arco-avatar__status arco-avatar__status--online" aria-hidden="true" />
      </span>
      <span className="arco-nav-sidebar__user-body">
        <span className="arco-nav-sidebar__user-name">{name}</span>
        {meta ? <span className="arco-nav-sidebar__user-meta">{meta}</span> : null}
      </span>
    </button>
  );
}
