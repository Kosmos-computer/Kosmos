import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { useCallback } from "react";
import { Copy, Download, MoreVertical, Trash2 } from "lucide-react";
import { exportDocToMarkdown } from "@arco/editor-kit";
import type { JSONContent } from "@arco/editor-kit";
import { Menu, type MenuItem } from "../../components/Menu";

export interface NoteEditorMenuProps {
  noteId: string;
  title: string;
  noteDoc: JSONContent;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function NoteEditorMenu({
  noteId,
  title,
  noteDoc,
  onDuplicate,
  onDelete,
}: NoteEditorMenuProps) {
  const displayTitle = title.trim() || "Untitled";

  const handleExport = useCallback(() => {
    const markdown = exportDocToMarkdown(
      noteDoc as Parameters<typeof exportDocToMarkdown>[0],
    );
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${displayTitle.replace(/[^\w.-]+/g, "-").slice(0, 60) || noteId}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [displayTitle, noteDoc, noteId]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`Delete “${displayTitle}”? This cannot be undone.`)) {
      onDelete();
    }
  }, [displayTitle, onDelete]);

  const menuItems: MenuItem[] = [
    {
      id: "duplicate",
      label: "Duplicate",
      icon: Copy,
      onSelect: onDuplicate,
    },
    {
      id: "export",
      label: "Export as Markdown",
      icon: Download,
      onSelect: handleExport,
    },
    {
      id: "delete",
      label: "Delete note",
      icon: Trash2,
      separatorAbove: true,
      danger: true,
      onSelect: handleDelete,
    },
  ];

  return (
    <Menu
      side="bottom"
      align="end"
      aria-label={i18n.t(I18nKey.APPS$NOTES_NOTE_ACTIONS)}
      items={menuItems}
      trigger={
        <button
          type="button"
          className="arco-btn arco-btn--icon arco-notes__menu-btn"
          aria-label={i18n.t(I18nKey.APPS$NOTES_NOTE_ACTIONS)}
        >
          <MoreVertical size={14} />
        </button>
      }
    />
  );
}
