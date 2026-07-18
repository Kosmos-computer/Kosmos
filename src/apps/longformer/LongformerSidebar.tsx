import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useMemo } from "react";
import {
  BookOpen,
  Layers,
  Loader2,
  Mic,
  Plus,
  Settings,
  Upload,
} from "lucide-react";
import { ListSearch, NavSidebar } from "../../components/patterns";
import { LongformerUploadMenu } from "./LongformerUploadMenu";
import type { LongformerViewModel } from "./longformerStore";
import type { LongformerView } from "./types";

const VIEW_ICONS = {
  library: BookOpen,
  "in-progress": Loader2,
  sources: Layers,
  uploads: Upload,
  settings: Settings,
} as const;

interface LongformerSidebarProps {
  vm: LongformerViewModel;
}

/** Project explorer — nav, sources, media files, and quick open actions. */
export function LongformerSidebar({ vm }: LongformerSidebarProps) {
  const { data, view, setView, openTranscript, uploadFile, openDrivePicker, uploading } = vm;
  const navItems = data.navItems.filter((item) =>
    ["library", "in-progress", "sources", "uploads", "settings"].includes(item.view),
  );
  const recentItems = useMemo(
    () =>
      [...data.transcripts]
        .sort((a, b) => b.createdAtMs - a.createdAtMs)
        .slice(0, 5),
    [data.transcripts],
  );

  const handleViewChange = (next: LongformerView) => {
    setView(next);
    vm.closeEditor();
  };

  return (
    <NavSidebar
      className="arco-longformer-sidebar"
      header={
        <>
          <div className="arco-longformer-sidebar__brand">
            <span className="arco-longformer-sidebar__brand-icon" aria-hidden="true">
              <Mic size={16} strokeWidth={1.75} />
            </span>
            <div className="arco-longformer-sidebar__brand-body">
              <span className="arco-longformer-sidebar__brand-name">{data.productName}</span>
              <span className="arco-longformer-sidebar__brand-role"><T k={I18nKey.APPS$LONGFORMER_TRANSCRIPTION} /></span>
            </div>
          </div>
          <ListSearch
            value={vm.searchQuery}
            onChange={(query) => {
              vm.setSearchQuery(query);
              if (view !== "library") handleViewChange("library");
            }}
            placeholder={i18n.t(I18nKey.APPS$LONGFORMER_SEARCH_TRANSCRIPTS)}
            ariaLabel="Search transcripts"
            compact
            className="arco-longformer-sidebar__search-field"
          />
        </>
      }
      primarySlot={
        <LongformerUploadMenu
          label="New"
          icon={Plus}
          variant="primary"
          className="arco-nav-sidebar__primary"
          align="start"
          disabled={uploading}
          onPickLocal={uploadFile}
          onPickDrive={openDrivePicker}
        />
      }
      sections={[
        {
          id: "primary",
          items: navItems.map((item) => {
            const Icon = VIEW_ICONS[item.view as keyof typeof VIEW_ICONS] ?? BookOpen;
            return {
              id: item.id,
              label: item.label,
              leading: <Icon size={16} strokeWidth={1.75} />,
              trailing: item.badge ? <span className="arco-longformer-sidebar__badge">{item.badge}</span> : undefined,
              active: view === item.view,
              onClick: () => handleViewChange(item.view),
            };
          }),
        },
        ...(recentItems.length > 0
          ? [
              {
                id: "recent",
                title: "Recent",
                items: recentItems.map((item) => ({
                  id: item.id,
                  label: item.title,
                  trailing: (
                    <span className="arco-longformer-sidebar__meta">
                      {item.createdAt}
                    </span>
                  ),
                  active: vm.selectedTranscriptId === item.id,
                  onClick: () => openTranscript(item.id),
                })),
              },
            ]
          : []),
      ]}
    />
  );
}
