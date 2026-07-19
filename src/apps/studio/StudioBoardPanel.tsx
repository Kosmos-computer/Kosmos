/**
 * Board embedded in Studio's main content (right of the conversation rail).
 */
import { useState } from "react";
import { AddWorkItemModal } from "../board/AddWorkItemModal";
import { BoardCanvas } from "../board/BoardCanvas";
import { startAgentOnWorkItem } from "../board/boardActions";
import { useBoard } from "../board/useBoard";
import type { CreateWorkItemForm } from "../board/types";
import { useStudioStore } from "./studioStore";

export function StudioBoardPanel() {
  const projectsInfo = useStudioStore((s) => s.projectsInfo);
  const workspace = useStudioStore((s) => s.workspace);
  const setMainSurface = useStudioStore((s) => s.setMainSurface);
  const [modalOpen, setModalOpen] = useState(false);

  const projectId = projectsInfo.activeId;
  const board = useBoard({ projectId: projectId ?? undefined });

  async function handleCreate(input: CreateWorkItemForm) {
    await board.createItem({
      ...input,
      projectId: projectId ?? null,
      worktreePath: workspace.worktreePath,
    });
  }

  async function handleStartAgent(input: CreateWorkItemForm & { brief: string }) {
    const created = await board.createItem({
      title: input.title,
      description: input.brief,
      columnId: "in_progress",
      priority: input.priority,
      projectId: projectId ?? null,
      worktreePath: workspace.worktreePath,
      assignee: { kind: "agent", name: "Agent" },
    });
    if (created) {
      setMainSurface("chat");
      startAgentOnWorkItem(created, { brief: input.brief, submit: true });
    }
  }

  return (
    <div className="arco-board arco-board--studio-main">
      <div className="arco-board__shell">
        <div className="arco-board__chrome">
          <div className="arco-board__studio-head">
            <div>
              <h1 className="arco-board__studio-title">Board</h1>
              <p className="arco-board__studio-sub">
                Start and manage agent jobs — cards move as work advances.
              </p>
            </div>
            <button
              type="button"
              className="arco-btn arco-btn--primary"
              onClick={() => setModalOpen(true)}
            >
              New work item
            </button>
          </div>
        </div>
        <BoardCanvas board={board} />
      </div>

      <AddWorkItemModal
        open={modalOpen}
        defaultColumnId="ready"
        onClose={() => setModalOpen(false)}
        onAdd={handleCreate}
        onStartAgent={handleStartAgent}
      />
    </div>
  );
}
