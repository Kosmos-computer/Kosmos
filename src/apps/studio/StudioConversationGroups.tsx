/**
 * Workspace-folder groups for the Studio conversations rail — collapse, drag
 * reorder, preview truncation, and + to start a chat in that folder.
 */
import { useCallback, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Folder, FolderGit2, FolderOpen, MoreHorizontal, Plus } from "lucide-react";
import type { SessionSummary } from "@shared/types";
import {
  getGroupSessionPreview,
  moveGroupOrder,
  type GroupDropPosition,
  type SessionGroup,
} from "./sidebarGrouping";

export interface StudioConversationGroupsProps {
  groups: SessionGroup[];
  groupOrder: readonly string[];
  collapsedGroups: readonly string[];
  expandedPreviews: readonly string[];
  activeSessionId?: string;
  onGroupOrderChange: (order: readonly string[]) => void;
  onToggleCollapsed: (groupId: string) => void;
  onTogglePreview: (groupId: string) => void;
  onNewChatInGroup: (projectId: string | null) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  renderRow: (props: {
    session: SessionSummary;
    active: boolean;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
  }) => ReactNode;
}

export function StudioConversationGroups({
  groups,
  groupOrder,
  collapsedGroups,
  expandedPreviews,
  activeSessionId,
  onGroupOrderChange,
  onToggleCollapsed,
  onTogglePreview,
  onNewChatInGroup,
  onSelect,
  onDelete,
  renderRow,
}: StudioConversationGroupsProps) {
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<GroupDropPosition | null>(null);
  const groupIds = groups.map((g) => g.id);

  const resetDrag = useCallback(() => {
    setDraggedGroupId(null);
    setDropTargetId(null);
    setDropPosition(null);
  }, []);

  const computeDropPosition = useCallback((event: DragEvent<HTMLElement>): GroupDropPosition => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  }, []);

  const handleDrop = useCallback(
    (targetGroupId: string, position: GroupDropPosition) => {
      if (!draggedGroupId || draggedGroupId === targetGroupId) {
        resetDrag();
        return;
      }
      onGroupOrderChange(
        moveGroupOrder(groupOrder, groupIds, draggedGroupId, targetGroupId, position),
      );
      resetDrag();
    },
    [draggedGroupId, groupIds, groupOrder, onGroupOrderChange, resetDrag],
  );

  return (
    <div className="arco-sidenav__groups">
      {groups.map((group) => (
        <GroupFolder
          key={group.id}
          group={group}
          expanded={!collapsedGroups.includes(group.id)}
          previewExpanded={expandedPreviews.includes(group.id)}
          activeSessionId={activeSessionId}
          isDragging={draggedGroupId === group.id}
          dropIndicator={
            dropTargetId === group.id && draggedGroupId !== group.id ? dropPosition : null
          }
          onToggleExpanded={() => onToggleCollapsed(group.id)}
          onTogglePreview={() => onTogglePreview(group.id)}
          onNewChat={() => onNewChatInGroup(group.projectId)}
          onDragStart={() => setDraggedGroupId(group.id)}
          onDragEnd={resetDrag}
          onDragOver={(event) => {
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
            setDropTargetId(group.id);
            setDropPosition(computeDropPosition(event));
          }}
          onDragLeave={() => {
            setDropTargetId((current) => (current === group.id ? null : current));
          }}
          onDrop={(event) => {
            event.preventDefault();
            handleDrop(group.id, computeDropPosition(event));
          }}
          renderRow={(session) =>
            renderRow({
              session,
              active: session.id === activeSessionId,
              onSelect,
              onDelete,
            })
          }
        />
      ))}
    </div>
  );
}

function GroupFolder({
  group,
  expanded,
  previewExpanded,
  activeSessionId,
  isDragging,
  dropIndicator,
  onToggleExpanded,
  onTogglePreview,
  onNewChat,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  renderRow,
}: {
  group: SessionGroup;
  expanded: boolean;
  previewExpanded: boolean;
  activeSessionId?: string;
  isDragging: boolean;
  dropIndicator: GroupDropPosition | null;
  onToggleExpanded: () => void;
  onTogglePreview: () => void;
  onNewChat: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  renderRow: (session: SessionSummary) => ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const didDragRef = useRef(false);
  const headingId = `thread-folder-${group.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const { visible, truncated, showingAll } = getGroupSessionPreview(group.sessions, {
    expanded: previewExpanded,
    activeSessionId,
  });
  const FolderIcon = group.projectId ? FolderGit2 : expanded ? FolderOpen : Folder;

  return (
    <section
      ref={sectionRef}
      className={`arco-sidenav__group ${isDragging ? "arco-sidenav__group--dragging" : ""}`}
      aria-labelledby={headingId}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dropIndicator && (
        <div
          className={`arco-sidenav__groupdrop arco-sidenav__groupdrop--${dropIndicator}`}
          aria-hidden="true"
        />
      )}
      <div className="arco-sidenav__groupheader">
        <button
          type="button"
          draggable
          id={headingId}
          className="arco-sidenav__grouptoggle"
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${group.label}` : `Expand ${group.label}`}
          onClick={() => {
            if (didDragRef.current) {
              didDragRef.current = false;
              return;
            }
            onToggleExpanded();
          }}
          onDragStart={(event) => {
            didDragRef.current = false;
            event.stopPropagation();
            event.dataTransfer?.setData("text/plain", group.id);
            if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
            onDragStart();
          }}
          onDrag={(event) => {
            if (event.clientX !== 0 || event.clientY !== 0) didDragRef.current = true;
          }}
          onDragEnd={(event) => {
            event.stopPropagation();
            onDragEnd();
          }}
        >
          <FolderIcon size={14} className="arco-sidenav__groupicon" aria-hidden="true" />
          <span className="arco-sidenav__grouplabel">{group.label}</span>
        </button>
        <button
          type="button"
          className="arco-btn arco-btn--icon arco-sidenav__groupadd"
          aria-label={`New chat in ${group.label}`}
          onClick={(event) => {
            event.stopPropagation();
            onNewChat();
          }}
        >
          <Plus size={14} />
        </button>
      </div>
      {expanded && (
        <div className="arco-sidenav__groupitems">
          {visible.map((session) => renderRow(session))}
          {truncated && (
            <button type="button" className="arco-sidenav__groupmore" onClick={onTogglePreview}>
              <MoreHorizontal size={12} className="arco-sidenav__groupmoreicon" aria-hidden="true" />
              {showingAll ? "View less" : "View more"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
