import { exportDocToMarkdown } from "@arco/editor-kit";
import type { JSONContent } from "@arco/editor-kit";
import { Copy, Download, Trash2 } from "lucide-react";
import type { MenuItem } from "../../components/Menu";

/** Download a note document as a Markdown file. */
export function downloadNoteAsMarkdown(
  noteId: string,
  title: string,
  noteDoc: JSONContent,
): void {
  const displayTitle = title.trim() || "Untitled";
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
}

/** Shared Duplicate / Export / Delete items for editor and nav menus. */
export function buildNoteActionMenuItems({
  displayTitle,
  onDuplicate,
  onExport,
  onDelete,
}: {
  displayTitle: string;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}): MenuItem[] {
  return [
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
      onSelect: onExport,
    },
    {
      id: "delete",
      label: "Delete note",
      icon: Trash2,
      separatorAbove: true,
      danger: true,
      onSelect: () => {
        if (window.confirm(`Delete “${displayTitle}”? This cannot be undone.`)) {
          onDelete();
        }
      },
    },
  ];
}
