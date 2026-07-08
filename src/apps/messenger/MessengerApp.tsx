import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { LayoutGrid, MessageCircle } from "lucide-react";
import { ConnectServiceModal } from "../../components/patterns/ConnectServiceModal";
import { Button } from "../../components/ui";
import { MessengerHub, MessengerInbox } from "./MessengerInbox";
import { useMessengerStub } from "./useMessengerStub";

export function MessengerApp() {
  const vm = useMessengerStub();

  return (
    <div className="arco-messenger">
      {!vm.hasConnection ? (
        <div className="arco-messenger__connect-banner">
          <span><T k={I18nKey.APPS$MESSENGER_DEMO_CONVERSATIONS_CONNECT_AN_ACCOUNT_TO_SYNC_REAL_MESSA} /></span>
          <Button variant="primary" size="default" onClick={() => vm.setConnectOpen(true)}><T k={I18nKey.COMMON$CONNECT} /></Button>
        </div>
      ) : null}

      <nav className="arco-messenger__view-toggle" aria-label={i18n.t(I18nKey.APPS$MESSENGER_MESSENGER_VIEWS)}>
        <button
          type="button"
          className={vm.view === "hub" ? "arco-messenger__view-btn--active" : ""}
          onClick={() => vm.setView("hub")}
          aria-pressed={vm.view === "hub"}
        >
          <MessageCircle size={14} /><T k={I18nKey.APPS$MESSENGER_CHATS} /></button>
        <button
          type="button"
          className={vm.view === "inbox" ? "arco-messenger__view-btn--active" : ""}
          onClick={() => vm.setView("inbox")}
          aria-pressed={vm.view === "inbox"}
        >
          <LayoutGrid size={14} /><T k={I18nKey.APPS$MESSENGER_INBOX} /></button>
      </nav>

      {vm.view === "hub" ? <MessengerHub vm={vm} /> : <MessengerInbox vm={vm} />}

      <ConnectServiceModal
        open={vm.connectOpen}
        onClose={() => vm.setConnectOpen(false)}
        domain="social"
        existingConnections={vm.connectionsAll}
        onConnect={(input) => vm.addConnection(input)}
        onSelectExisting={() => vm.setConnectOpen(false)}
      />
    </div>
  );
}
