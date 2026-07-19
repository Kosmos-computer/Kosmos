import { useMemo, useState } from "react";
import { ModuleFilterSelect, ModuleHeader } from "../../components/patterns";
import { Button } from "../../components/ui/Button";
import { useStudioStore } from "../studio/studioStore";
import { AddWorkItemModal } from "./AddWorkItemModal";
import { BoardCanvas } from "./BoardCanvas";
import { startAgentOnWorkItem } from "./boardActions";
import { useBoard } from "./useBoard";
import type { CreateWorkItemForm } from "./types";

type ProjectFilter = "all" | "active" | "none";

export function BoardApp() {
  const projectsInfo = useStudioStore((s) => s.projectsInfo);
  const workspace = useStudioStore((s) => s.workspace);
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);

  const projectId = useMemo(() => {
    if (projectFilter === "active") return projectsInfo.activeId;
    if (projectFilter === "none") return null;
    return undefined;
  }, [projectFilter, projectsInfo.activeId]);

  const board = useBoard({ projectId });

  const projectOptions = useMemo(() => {
    const options: { value: ProjectFilter; label: string }[] = [
      { value: "all", label: "All projects" },
    ];
    if (projectsInfo.activeId) {
      const name =
        projectsInfo.projects.find((p) => p.id === projectsInfo.activeId)?.name ??
        "Active project";
      options.push({ value: "active", label: name });
    }
    options.push({ value: "none", label: "No project" });
    return options;
  }, [projectsInfo.activeId, projectsInfo.projects]);

  async function handleCreate(input: CreateWorkItemForm) {
    await board.createItem({
      ...input,
      projectId: projectsInfo.activeId,
      worktreePath: workspace.worktreePath,
    });
  }

  async function handleStartAgent(input: CreateWorkItemForm & { brief: string }) {
    const created = await board.createItem({
      title: input.title,
      description: input.brief,
      columnId: "in_progress",
      priority: input.priority,
      projectId: projectsInfo.activeId,
      worktreePath: workspace.worktreePath,
      assignee: { kind: "agent", name: "Agent" },
    });
    if (created) {
      startAgentOnWorkItem(created, { brief: input.brief, submit: true });
    }
  }

  return (
    <div className="arco-panel arco-board">
      <div className="arco-board__shell">
        <div className="arco-board__chrome">
          <ModuleHeader
            title="Board"
            subtitle="Start and manage agent jobs — cards move across the lifecycle as work advances."
            actions={
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                New work item
              </Button>
            }
          />

          <div className="arco-board__filters">
            <ModuleFilterSelect
              label="Project"
              value={projectFilter}
              options={projectOptions}
              onChange={(value) => setProjectFilter(value)}
              portal
            />
          </div>
        </div>

        <BoardCanvas board={board} />
      </div>

      <AddWorkItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleCreate}
        onStartAgent={handleStartAgent}
      />
    </div>
  );
}
