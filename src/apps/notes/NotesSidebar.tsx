import { Folder, Globe, LayoutGrid, Notebook, Plus, Search } from "lucide-react";
import { NavSidebar, SidebarUserFooter } from "../../components/patterns";
import type { NoteNavPage, NotesView } from "./types";

function pageIcon(icon: NoteNavPage["icon"]) {
  const Icon = icon === "folder" ? Folder : Notebook;
  return <Icon size={14} strokeWidth={1.75} />;
}

export function NotesSidebar({
  sections,
  view,
  userName,
  onSelectPage,
  onCreatePage,
  onViewChange,
}: {
  sections: {
    ideas: (NoteNavPage & { active?: boolean })[];
    recents: (NoteNavPage & { active?: boolean })[];
    private: (NoteNavPage & { active?: boolean })[];
    teamspaces: (NoteNavPage & { active?: boolean })[];
  };
  view: NotesView;
  userName: string;
  onSelectPage: (id: string) => void;
  onCreatePage: () => void;
  onViewChange: (view: NotesView) => void;
}) {
  const toItems = (pages: (NoteNavPage & { active?: boolean })[]) =>
    pages.map((page) => ({
      id: page.id,
      label: page.label,
      leading: pageIcon(page.icon),
      trailing: page.meta,
      active: page.active,
      onClick: () => onSelectPage(page.id),
    }));

  return (
    <NavSidebar
      primaryAction={{ label: "New page", icon: Plus, onClick: onCreatePage }}
      quickLinks={[
        { id: "search", label: "Search", icon: Search },
        { id: "home", label: "Home", icon: LayoutGrid },
        {
          id: "graph",
          label: "Graph view",
          icon: Globe,
          active: view === "graph",
          onClick: () => onViewChange(view === "graph" ? "editor" : "graph"),
        },
      ]}
      sections={[
        { id: "ideas", title: "Ideas", items: toItems(sections.ideas) },
        { id: "recents", title: "Recents", items: toItems(sections.recents) },
        { id: "private", title: "Private", items: toItems(sections.private) },
        { id: "teamspaces", title: "Teamspaces", items: toItems(sections.teamspaces) },
      ]}
      footer={<SidebarUserFooter name={userName} meta="Arco · Notes" />}
    />
  );
}
