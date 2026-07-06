import { Button } from "../../components/ui";

export function DeleteConfirmModal({
  name,
  open,
  onConfirm,
  onCancel,
}: {
  name: string;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="arco-task-modal__backdrop" role="presentation" onClick={onCancel}>
      <div
        className="arco-task-modal"
        role="alertdialog"
        aria-labelledby="delete-automation-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="arco-task-modal__header">
          <h2 id="delete-automation-title">Delete automation?</h2>
        </header>
        <div className="arco-task-modal__body">
          <p style={{ margin: 0, fontSize: "var(--arco-text-sm)" }}>
            <strong>{name}</strong> will be permanently removed along with its run history.
          </p>
        </div>
        <footer className="arco-task-modal__footer">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>
            Delete
          </Button>
        </footer>
      </div>
    </div>
  );
}
