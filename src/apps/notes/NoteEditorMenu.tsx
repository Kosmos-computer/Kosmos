import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { useMemo } from "react";
import { MoreVertical } from "lucide-react";
import type { JSONContent } from "@arco/editor-kit";
import { Menu } from "../../components/Menu";
import { buildNoteActionMenuItems, downloadNoteAsMarkdown } from "./noteActions";

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

  const menuItems = useMemo(
    () =>
      buildNoteActionMenuItems({
        displayTitle,
        onDuplicate,
        onExport: () => downloadNoteAsMarkdown(noteId, title, noteDoc),
        onDelete,
      }),
    [displayTitle, noteDoc, noteId, onDelete, onDuplicate, title],
  );

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
