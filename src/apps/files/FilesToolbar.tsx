import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { Grid3X3, Image, LayoutList, MoreHorizontal, Search, SlidersHorizontal, Upload } from "lucide-react";
import { Input } from "../../components/ui";
import { Button } from "../../components/ui";
import type { FilesViewMode } from "./types";

const VIEW_MODES: { id: FilesViewMode; label: string; icon: typeof LayoutList }[] = [
  { id: "list", label: "List view", icon: LayoutList },
  { id: "grid", label: "Grid view", icon: Grid3X3 },
  { id: "gallery", label: "Gallery view", icon: Image },
];

export interface FilesToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: FilesViewMode;
  onViewModeChange: (mode: FilesViewMode) => void;
  title?: string;
  onUpload?: () => void;
}

export function FilesToolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  title,
  onUpload,
}: FilesToolbarProps) {
  return (
    <div className="arco-drive-toolbar">
      {title ? <h2 className="arco-drive-toolbar__title">{title}</h2> : null}
      <div className="arco-drive-toolbar__search">
        <Search size={15} className="arco-drive-toolbar__search-icon" aria-hidden="true" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={i18n.t(I18nKey.APPS$FILES_SEARCH_IN_DRIVE)}
          aria-label={i18n.t(I18nKey.APPS$FILES_SEARCH_FILES)}
          className="arco-drive-toolbar__search-input"
        />
      </div>
      <div className="arco-drive-toolbar__actions">
        {onUpload ? (
          <Button variant="default" onClick={onUpload} aria-label="Upload files">
            <Upload size={15} />
            Upload
          </Button>
        ) : null}
        <div className="arco-drive-toolbar__view-toggle" role="group" aria-label={i18n.t(I18nKey.APPS$FILES_VIEW_OPTIONS)}>
          {VIEW_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <Button
                key={mode.id}
                variant={viewMode === mode.id ? "default" : "ghost"}
                size="icon"
                aria-pressed={viewMode === mode.id}
                aria-label={mode.label}
                onClick={() => onViewModeChange(mode.id)}
              >
                <Icon size={15} />
              </Button>
            );
          })}
        </div>
        <Button variant="ghost" size="icon" aria-label={i18n.t(I18nKey.APPS$FILES_MORE_ACTIONS)}>
          <MoreHorizontal size={15} />
        </Button>
        <Button variant="ghost" size="icon" aria-label={i18n.t(I18nKey.APPS$FILES_SORT_AND_FILTER)}>
          <SlidersHorizontal size={15} />
        </Button>
      </div>
    </div>
  );
}
