import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { useState } from "react";
import { PreviewPane, SidebarPane } from "../../components/patterns";
import { AddTaskModal } from "./AddTaskModal";
import { MiniCalendar } from "./MiniCalendar";
import { TaskDrawer, TaskHistoryPanel } from "./TaskDrawer";
import { TasksList } from "./TaskList";
import { useTasks } from "./useTasks";

export function TasksApp() {
  const tasks = useTasks();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const editingTask = editingTaskId ? tasks.tasks.find((task) => task.id === editingTaskId) ?? null : null;
  const taskModalOpen = addModalOpen || editingTaskId !== null;

  function closeTaskModal() {
    setAddModalOpen(false);
    setEditingTaskId(null);
  }

  return (
    <div className="arco-tasks">
      <SidebarPane width={tasks.calendarWidth} onWidthChange={tasks.setCalendarWidth} minWidth={220} maxWidth={320}>
        <div className="arco-tasks__calendar-wrap arco-scroll">
          <MiniCalendar
            month={tasks.calendarMonth}
            year={tasks.calendarYear}
            selectedDate={tasks.selectedDate}
            highlightedDates={tasks.highlightedDates}
            onPrevMonth={tasks.handlePrevMonth}
            onNextMonth={tasks.handleNextMonth}
            onToday={tasks.handleToday}
            onSelectDate={tasks.setSelectedDate}
          />
        </div>
      </SidebarPane>

      <TasksList
        groups={tasks.groups}
        openCount={tasks.openCount}
        selectedTaskId={tasks.selectedTaskId}
        onSelectTask={tasks.selectTask}
        onToggleComplete={tasks.toggleComplete}
        onAddTask={() => setAddModalOpen(true)}
        onShowHistory={() => tasks.setHistoryOpen(true)}
      />

      {tasks.selectedTask ? (
        <PreviewPane
          width={tasks.drawerWidth}
          onWidthChange={tasks.setDrawerWidth}
          minWidth={300}
          maxWidth={480}
          handleLabel={i18n.t(I18nKey.APPS$TASKS_RESIZE_TASK_DRAWER)}
        >
          <TaskDrawer
            task={tasks.selectedTask}
            history={tasks.taskHistory}
            onClose={tasks.closeDrawer}
            onEdit={setEditingTaskId}
            onToggleComplete={tasks.toggleComplete}
            onArchive={tasks.archiveTask}
            onRestore={tasks.restoreTask}
            onDelete={tasks.deleteTask}
          />
        </PreviewPane>
      ) : null}

      <AddTaskModal
        open={taskModalOpen}
        task={editingTask}
        defaultDueDateISO={tasks.selectedDate ?? tasks.defaultDueDateISO}
        onClose={closeTaskModal}
        onAdd={tasks.addTask}
        onUpdate={tasks.updateTask}
      />

      <TaskHistoryPanel
        open={tasks.historyOpen}
        events={tasks.sortedHistory}
        onClose={() => tasks.setHistoryOpen(false)}
      />
    </div>
  );
}
