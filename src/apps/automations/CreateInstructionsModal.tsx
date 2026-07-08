import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
import { MessageSquareShare } from "lucide-react";
import { Button } from "../../components/ui";
import { primeComposer } from "../chat/composerBus";
import { systemAppTitle } from "../../os/systemAppTitles";
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
    useWindowStore.getState().open({ type: "system", app: "chat" }, systemAppTitle("chat"));
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
          <h2 id="create-automation-title"><T k={I18nKey.APPS$AUTOMATIONS_CREATE_AN_AUTOMATION} /></h2>
        </header>
        <div className="arco-task-modal__body">
          <p style={{ margin: 0, fontSize: "var(--arco-text-sm)", lineHeight: 1.5 }}><T k={I18nKey.APPS$AUTOMATIONS_DESCRIBE_WHAT_YOU_WANT_IN_CHAT_FOR_EXAMPLE} />{" "}
            <code><T k={I18nKey.APPS$AUTOMATIONS_EVERY_WEEKDAY_AT_9AM_SUMMARIZE_MY_CALENDAR_AND_OPEN_TASK} /></code><T k={I18nKey.APPS$AUTOMATIONS_ARCO_CAN_CREATE_THE_SCHEDULE_WRITE_THE_PROMPT_AND_OPTION} /></p>
          <p
            style={{
              margin: "12px 0 0",
              fontSize: "var(--arco-text-xs)",
              color: "var(--arco-text-muted)",
            }}
          ><T k={I18nKey.APPS$AUTOMATIONS_HEADLESS_RUNS_DENY_TOOLS_THAT_NEED_CONFIRMATION_ADD_EXPL} /></p>
        </div>
        <footer className="arco-task-modal__footer">
          <Button onClick={onClose}><T k={I18nKey.COMMON$CANCEL} /></Button>
          <Button variant="primary" onClick={launchInChat}>
            <MessageSquareShare size={13} /><T k={I18nKey.APPS$AUTOMATIONS_CREATE_IN_CHAT} /></Button>
        </footer>
      </div>
    </div>
  );
}
