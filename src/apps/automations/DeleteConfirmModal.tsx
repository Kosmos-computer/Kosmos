import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
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
          <h2 id="delete-automation-title"><T k={I18nKey.APPS$AUTOMATIONS_DELETE_AUTOMATION} /></h2>
        </header>
        <div className="arco-task-modal__body">
          <p style={{ margin: 0, fontSize: "var(--arco-text-sm)" }}>
            <strong>{name}</strong><T k={I18nKey.APPS$AUTOMATIONS_WILL_BE_PERMANENTLY_REMOVED_ALONG_WITH_ITS_RUN_HISTORY} /></p>
        </div>
        <footer className="arco-task-modal__footer">
          <Button onClick={onCancel}><T k={I18nKey.COMMON$CANCEL} /></Button>
          <Button variant="danger" onClick={onConfirm}><T k={I18nKey.COMMON$DELETE} /></Button>
        </footer>
      </div>
    </div>
  );
}
