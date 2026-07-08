import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
/**
 * Memory workspace sidebar — Psyche nav ported to Arco NavSidebar.
 */
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { NavSidebar } from "../../components/patterns/NavSidebar";
import { Input } from "../../components/ui";
import type { MemoryNavItem, MemoryViewId, MemoryWorkspaceData } from "./types";

export interface MemorySidebarProps {
  data: MemoryWorkspaceData;
  view: MemoryViewId;
  onViewChange: (view: MemoryViewId) => void;
}

function filterItems(items: MemoryNavItem[], query: string): MemoryNavItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => item.label.toLowerCase().includes(normalized));
}

export function MemorySidebar({ data, view, onViewChange }: MemorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const overviewItems = useMemo(
    () => filterItems(data.navItems.filter((item) => item.section === "overview"), searchQuery),
    [data.navItems, searchQuery],
  );
  const storeItems = useMemo(
    () => filterItems(data.navItems.filter((item) => item.section === "stores"), searchQuery),
    [data.navItems, searchQuery],
  );
  const identityItems = useMemo(
    () => filterItems(data.navItems.filter((item) => item.section === "identity"), searchQuery),
    [data.navItems, searchQuery],
  );

  const toSection = (items: MemoryNavItem[]) =>
    items.map((item) => {
      const Icon = item.icon;
      return {
        id: item.id,
        label: item.label,
        leading: <Icon size={16} aria-hidden="true" />,
        active: view === item.view,
        onClick: () => onViewChange(item.view),
      };
    });

  return (
    <NavSidebar
      className="arco-memory-sidebar"
      header={
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={i18n.t(I18nKey.APPS$MEMORY_SEARCH_VIEWS)}
          aria-label={i18n.t(I18nKey.APPS$MEMORY_SEARCH_MEMORY_VIEWS)}
          startSlot={<Search size={14} aria-hidden="true" />}
        />
      }
      primaryAction={{
        label: "Add memory",
        icon: Plus,
        onClick: () => onViewChange("memory"),
      }}
      sections={[
        ...(overviewItems.length > 0
          ? [{ id: "overview", items: toSection(overviewItems) }]
          : []),
        ...(storeItems.length > 0
          ? [{ id: "stores", title: "Knowledge stores", items: toSection(storeItems) }]
          : []),
        ...(identityItems.length > 0
          ? [{ id: "identity", title: "Identity", items: toSection(identityItems) }]
          : []),
      ]}
      footer={<p className="arco-memory-sidebar__note">{data.systemNote}</p>}
    />
  );
}
