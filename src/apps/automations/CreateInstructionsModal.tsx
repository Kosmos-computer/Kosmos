import { MessageSquareShare } from "lucide-react";
import { Button } from "../../components/ui";
import { primeComposer } from "../chat/composerBus";
import { useWindowStore } from "../../os/windowStore";
import { CREATE_AUTOMATION_PROMPT } from "./catalog";

export function CreateInstructionsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const launchInChat = () => {
    onClose();
    useWindowStore.getState().open({ type: "system", app: "chat" }, "Chat");
    primeComposer({ text: CREATE_AUTOMATION_PROMPT, submit: false });
  };

  return (
    <div className="arco-task-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="arco-task-modal"
        role="dialog"
        aria-labelledby="create-automation-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="arco-task-modal__header">
          <h2 id="create-automation-title">Create an automation</h2>
        </header>
        <div className="arco-task-modal__body">
          <p style={{ margin: 0, fontSize: "var(--arco-text-sm)", lineHeight: 1.5 }}>
            Describe what you want in chat — for example:{" "}
            <code>every weekday at 9am, summarize my calendar and open tasks</code>. Arco can
            create the schedule, write the prompt, and optionally deliver results to a channel.
          </p>
          <p
            style={{
              margin: "12px 0 0",
              fontSize: "var(--arco-text-xs)",
              color: "var(--arco-text-muted)",
            }}
          >
            Headless runs deny tools that need confirmation. Add explicit auto-allow rules in
            Settings → Agent permissions for write tools your automations must use.
          </p>
        </div>
        <footer className="arco-task-modal__footer">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={launchInChat}>
            <MessageSquareShare size={13} /> Create in chat
          </Button>
        </footer>
      </div>
    </div>
  );
}
