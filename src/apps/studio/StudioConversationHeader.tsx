import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
/**
 * Conversation top bar — title plus overflow menu (agent-canvas ConversationName).
 * Rename is inline (menu item or double-click); other actions use the shared Menu.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, MoreVertical, Pencil, SquarePen, Trash2 } from "lucide-react";
import { Menu, type MenuItem } from "../../components/Menu";
import { api } from "../../lib/api";

export interface StudioConversationHeaderProps {
  sessionId?: string;
  title: string;
  onRename?: (title: string) => void | Promise<void>;
  onNewChat: () => void;
  onDelete?: () => void | Promise<void>;
}

export function StudioConversationHeader({
  sessionId,
  title,
  onRename,
  onNewChat,
  onDelete,
}: StudioConversationHeaderProps) {
  const [titleMode, setTitleMode] = useState<"view" | "edit">("view");
  const inputRef = useRef<HTMLInputElement>(null);
  const displayTitle = title.trim() || "New chat";

  useEffect(() => {
    setTitleMode("view");
  }, [sessionId]);

  useEffect(() => {
    if (titleMode === "edit") inputRef.current?.focus();
  }, [titleMode]);

  const startRename = useCallback(() => {
    if (!onRename) return;
    setTitleMode("edit");
  }, [onRename]);

  const commitRename = useCallback(async () => {
    const value = inputRef.current?.value.trim();
    if (value && value !== title && onRename) {
      await onRename(value);
    } else if (inputRef.current) {
      inputRef.current.value = displayTitle;
    }
    setTitleMode("view");
  }, [displayTitle, onRename, title]);

  const handleDelete = useCallback(() => {
    if (!onDelete) return;
    if (window.confirm(`Delete “${displayTitle}”? This cannot be undone.`)) {
      void onDelete();
    }
  }, [displayTitle, onDelete]);

  const handleExport = useCallback(() => {
    if (!sessionId) return;
    void (async () => {
      try {
        const session = await api.getSession(sessionId);
        const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${displayTitle.replace(/[^\w.-]+/g, "-").slice(0, 60) || sessionId}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch {
        // Export failed — leave the thread as-is.
      }
    })();
  }, [displayTitle, sessionId]);

  const menuItems: MenuItem[] = [
    ...(onRename
      ? [
          {
            id: "rename",
            label: "Rename",
            icon: Pencil,
            onSelect: startRename,
          } satisfies MenuItem,
        ]
      : []),
    ...(sessionId
      ? [
          {
            id: "export",
            label: "Export conversation",
            icon: Download,
            onSelect: handleExport,
          } satisfies MenuItem,
        ]
      : []),
    {
      id: "new",
      label: "New session",
      icon: SquarePen,
      separatorAbove: true,
      onSelect: onNewChat,
    },
    ...(onDelete
      ? [
          {
            id: "delete",
            label: "Delete conversation",
            icon: Trash2,
            separatorAbove: true,
            danger: true,
            onSelect: handleDelete,
          } satisfies MenuItem,
        ]
      : []),
  ];

  return (
    <header className="arco-studio__convheader">
      {titleMode === "edit" ? (
        <input
          ref={inputRef}
          type="text"
          className="arco-studio__convtitle-input"
          defaultValue={displayTitle}
          aria-label={i18n.t(I18nKey.APPS$STUDIO_CONVERSATION_NAME)}
          onBlur={() => void commitRename()}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Enter") {
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              if (inputRef.current) inputRef.current.value = displayTitle;
              setTitleMode("view");
            }
          }}
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <h1
          className="arco-studio__convtitle"
          title={displayTitle}
          onDoubleClick={onRename ? startRename : undefined}
        >
          {displayTitle}
        </h1>
      )}

      {titleMode === "view" && (
        <Menu
          side="bottom"
          align="start"
          aria-label={i18n.t(I18nKey.APPS$STUDIO_CONVERSATION_ACTIONS)}
          items={menuItems}
          trigger={
            <button
              type="button"
              className="arco-btn arco-btn--icon arco-studio__convmenu"
              aria-label={i18n.t(I18nKey.APPS$STUDIO_CONVERSATION_ACTIONS)}
            >
              <MoreVertical size={14} />
            </button>
          }
        />
      )}
    </header>
  );
}
