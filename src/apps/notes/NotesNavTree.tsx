import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  Notebook,
  Plus,
} from "lucide-react";
import { ListItem } from "../../components/patterns";
import { NavSidebarSectionHeader } from "../../components/patterns";
import { computeNavDropPosition, type NavDropPosition } from "./notesNavUtils";
import type { NoteNavNode, NoteNavSection } from "./types";

type DecoratedPage = Extract<NoteNavNode, { type: "page" }> & { active?: boolean };

export interface NotesNavTreeProps {
  sections: NoteNavSection[];
  onSelectPage: (id: string) => void;
  onCreatePage: (sectionId: string, parentFolderId: string | null) => void;
  onCreateFolder: (sectionId: string, parentFolderId: string | null) => void;
  onMoveItem: (draggedId: string, targetId: string, position: NavDropPosition) => void;
  onToggleFolder: (folderId: string) => void;
}

export function NotesNavTree({
  sections,
  onSelectPage,
  onCreatePage,
  onCreateFolder,
  onMoveItem,
  onToggleFolder,
}: NotesNavTreeProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<NavDropPosition | null>(null);

  const resetDrag = useCallback(() => {
    setDraggedId(null);
    setDropTargetId(null);
    setDropPosition(null);
  }, []);

  const handleDrop = useCallback(
    (targetId: string, position: NavDropPosition) => {
      if (!draggedId || draggedId === targetId) {
        resetDrag();
        return;
      }
      onMoveItem(draggedId, targetId, position);
      resetDrag();
    },
    [draggedId, onMoveItem, resetDrag],
  );

  return (
    <>
      {sections.map((section) => (
        <div key={section.id} className="arco-notes-nav__section">
          <div className="arco-notes-nav__section-header">
            <NavSidebarSectionHeader title={section.title} />
            <div className="arco-notes-nav__section-actions">
              <button
                type="button"
                className="arco-btn arco-btn--icon arco-notes-nav__section-btn"
                aria-label={`New folder in ${section.title}`}
                title={i18n.t(I18nKey.APPS$NOTES_NEW_FOLDER)}
                onClick={() => onCreateFolder(section.id, null)}
              >
                <FolderPlus size={13} />
              </button>
              <button
                type="button"
                className="arco-btn arco-btn--icon arco-notes-nav__section-btn"
                aria-label={`New page in ${section.title}`}
                title={i18n.t(I18nKey.APPS$NOTES_NEW_PAGE)}
                onClick={() => onCreatePage(section.id, null)}
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
          <div className="arco-notes-nav__items">
            {section.items.map((node) => (
              <NavTreeNode
                key={node.id}
                node={node}
                sectionId={section.id}
                depth={0}
                draggedId={draggedId}
                dropTargetId={dropTargetId}
                dropPosition={dropPosition}
                onSelectPage={onSelectPage}
                onCreatePage={onCreatePage}
                onCreateFolder={onCreateFolder}
                onToggleFolder={onToggleFolder}
                onDragStart={setDraggedId}
                onDragEnd={resetDrag}
                onDragOver={(id, position) => {
                  setDropTargetId(id);
                  setDropPosition(position);
                }}
                onDragLeave={(id) => {
                  setDropTargetId((current) => {
                    if (current === id) {
                      setDropPosition(null);
                      return null;
                    }
                    return current;
                  });
                }}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function NavTreeNode({
  node,
  sectionId,
  depth,
  draggedId,
  dropTargetId,
  dropPosition,
  onSelectPage,
  onCreatePage,
  onCreateFolder,
  onToggleFolder,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  node: NoteNavNode;
  sectionId: string;
  depth: number;
  draggedId: string | null;
  dropTargetId: string | null;
  dropPosition: NavDropPosition | null;
  onSelectPage: (id: string) => void;
  onCreatePage: (sectionId: string, parentFolderId: string | null) => void;
  onCreateFolder: (sectionId: string, parentFolderId: string | null) => void;
  onToggleFolder: (folderId: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (id: string, position: NavDropPosition) => void;
  onDragLeave: (id: string) => void;
  onDrop: (targetId: string, position: NavDropPosition) => void;
}) {
  if (node.type === "page") {
    return (
      <DraggableNavRow
        nodeId={node.id}
        depth={depth}
        isFolder={false}
        draggedId={draggedId}
        dropTargetId={dropTargetId}
        dropPosition={dropPosition}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <PageRow page={node as DecoratedPage} onSelect={() => onSelectPage(node.id)} />
      </DraggableNavRow>
    );
  }

  const expanded = node.expanded !== false;
  const FolderIcon = expanded ? FolderOpen : Folder;
  const isDropInside = dropTargetId === node.id && dropPosition === "inside" && draggedId !== node.id;

  return (
    <DraggableNavRow
      nodeId={node.id}
      depth={depth}
      isFolder
      draggedId={draggedId}
      dropTargetId={dropTargetId}
      dropPosition={dropPosition}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className={`arco-notes-nav__folder ${isDropInside ? "arco-notes-nav__folder--drop-target" : ""}`}>
        <div className="arco-notes-nav__folder-header">
          <button
            type="button"
            className="arco-notes-nav__folder-toggle"
            aria-expanded={expanded}
            onClick={() => onToggleFolder(node.id)}
          >
            <ChevronRight
              size={12}
              className={`arco-notes-nav__chevron ${expanded ? "arco-notes-nav__chevron--expanded" : ""}`}
              aria-hidden="true"
            />
            <FolderIcon size={14} strokeWidth={1.75} aria-hidden="true" />
            <span className="arco-notes-nav__folder-label">{node.label}</span>
          </button>
          <div className="arco-notes-nav__folder-actions">
            <button
              type="button"
              className="arco-btn arco-btn--icon arco-notes-nav__folder-btn"
              aria-label={`New subfolder in ${node.label}`}
              title={i18n.t(I18nKey.APPS$NOTES_NEW_SUBFOLDER)}
              onClick={(event) => {
                event.stopPropagation();
                onCreateFolder(sectionId, node.id);
              }}
            >
              <FolderPlus size={12} />
            </button>
            <button
              type="button"
              className="arco-btn arco-btn--icon arco-notes-nav__folder-btn"
              aria-label={`New page in ${node.label}`}
              title={i18n.t(I18nKey.APPS$NOTES_NEW_PAGE)}
              onClick={(event) => {
                event.stopPropagation();
                onCreatePage(sectionId, node.id);
              }}
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
        {expanded && node.children.length > 0 && (
          <div className="arco-notes-nav__folder-children">
            {node.children.map((child) => (
              <NavTreeNode
                key={child.id}
                node={child}
                sectionId={sectionId}
                depth={depth + 1}
                draggedId={draggedId}
                dropTargetId={dropTargetId}
                dropPosition={dropPosition}
                onSelectPage={onSelectPage}
                onCreatePage={onCreatePage}
                onCreateFolder={onCreateFolder}
                onToggleFolder={onToggleFolder}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              />
            ))}
          </div>
        )}
      </div>
    </DraggableNavRow>
  );
}

function PageRow({ page, onSelect }: { page: DecoratedPage; onSelect: () => void }) {
  return (
    <ListItem
      className="arco-nav-sidebar__nav-item arco-notes-nav__page"
      leading={<Notebook size={14} strokeWidth={1.75} />}
      label={page.label}
      trailing={page.meta}
      active={page.active}
      onClick={onSelect}
    />
  );
}

function DraggableNavRow({
  nodeId,
  depth,
  isFolder,
  draggedId,
  dropTargetId,
  dropPosition,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}: {
  nodeId: string;
  depth: number;
  isFolder: boolean;
  draggedId: string | null;
  dropTargetId: string | null;
  dropPosition: NavDropPosition | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (id: string, position: NavDropPosition) => void;
  onDragLeave: (id: string) => void;
  onDrop: (targetId: string, position: NavDropPosition) => void;
  children: ReactNode;
}) {
  const didDragRef = useRef(false);
  const isDragging = draggedId === nodeId;
  const showDropBefore = dropTargetId === nodeId && dropPosition === "before" && draggedId !== nodeId;
  const showDropAfter = dropTargetId === nodeId && dropPosition === "after" && draggedId !== nodeId;

  return (
    <div
      className={`arco-notes-nav__row ${isDragging ? "arco-notes-nav__row--dragging" : ""}`}
      style={{ paddingLeft: `calc(var(--arco-space-s) + ${depth} * 12px)` }}
      draggable
      onDragStart={(event) => {
        didDragRef.current = false;
        event.dataTransfer?.setData("text/plain", nodeId);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
        onDragStart(nodeId);
      }}
      onDrag={(event) => {
        if (event.clientX !== 0 || event.clientY !== 0) didDragRef.current = true;
      }}
      onDragEnd={() => {
        onDragEnd();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        onDragOver(nodeId, computeNavDropPosition(event, isFolder));
      }}
      onDragLeave={() => onDragLeave(nodeId)}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(nodeId, computeNavDropPosition(event, isFolder));
      }}
    >
      {showDropBefore ? <div className="arco-notes-nav__drop arco-notes-nav__drop--before" aria-hidden="true" /> : null}
      {children}
      {showDropAfter ? <div className="arco-notes-nav__drop arco-notes-nav__drop--after" aria-hidden="true" /> : null}
    </div>
  );
}
