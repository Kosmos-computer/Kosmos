import {
  BookOpen,
  Clock,
  Layers,
  Loader2,
  Mic,
  Plus,
  Settings,
  Upload,
} from "lucide-react";
import { Button } from "../../components/ui";
import { ListSearch, NavSidebar, SidebarUserFooter } from "../../components/patterns";
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
  const { data, view, setView, openTranscript, openDemoProject, openFromMemory, uploadFile } = vm;
  const primaryItems = data.navItems.filter((item) =>
    ["library", "in-progress", "sources", "uploads"].includes(item.view),
  );
  const secondaryItems = data.navItems.filter((item) => item.view === "settings");

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
              <span className="arco-longformer-sidebar__brand-role">Transcription</span>
            </div>
          </div>
          <ListSearch
            value={vm.searchQuery}
            onChange={(query) => {
              vm.setSearchQuery(query);
              if (view !== "library") handleViewChange("library");
            }}
            placeholder="Search transcripts"
            ariaLabel="Search transcripts"
            compact
            className="arco-longformer-sidebar__search-field"
          />
        </>
      }
      primaryAction={{ label: "New", icon: Plus, onClick: uploadFile }}
      sections={[
        {
          id: "primary",
          items: primaryItems.map((item) => {
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
        {
          id: "secondary",
          items: secondaryItems.map((item) => {
            const Icon = VIEW_ICONS[item.view as keyof typeof VIEW_ICONS] ?? Settings;
            return {
              id: item.id,
              label: item.label,
              leading: <Icon size={16} strokeWidth={1.75} />,
              active: view === item.view,
              onClick: () => handleViewChange(item.view),
            };
          }),
        },
        {
          id: "sources",
          title: "Connected Sources",
          items: data.connectedSources.map((source) => ({
            id: source.id,
            label: source.label,
            leading: <Layers size={14} strokeWidth={1.75} />,
            trailing: (
              <span
                className="arco-longformer-sidebar__source-status"
                data-status={source.status}
                title={source.provider}
              />
            ),
          })),
        },
        {
          id: "pinned",
          title: "Recent",
          items: data.pinnedTranscripts.map((item) => ({
            id: item.id,
            label: item.label,
            trailing: item.meta ? <span className="arco-longformer-sidebar__meta">{item.meta}</span> : undefined,
            active: vm.selectedTranscriptId === item.id,
            onClick: () => openTranscript(item.id),
          })),
        },
      ]}
      footer={
        <div className="arco-longformer-sidebar__footer">
          <SidebarUserFooter name={vm.userName} meta={vm.userEmail} />
          <div className="arco-longformer-sidebar__footer-actions">
            <Button type="button" variant="ghost" onClick={uploadFile}>
              <Upload size={14} strokeWidth={1.75} />
              Upload
            </Button>
            <Button type="button" variant="ghost" onClick={openFromMemory}>
              <Clock size={14} strokeWidth={1.75} />
              From memory
            </Button>
            <Button type="button" variant="ghost" onClick={openDemoProject}>
              <Mic size={14} strokeWidth={1.75} />
              Demo project
            </Button>
          </div>
        </div>
      }
    />
  );
}
