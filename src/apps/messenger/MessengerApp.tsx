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
          <span>Demo conversations — connect an account to sync real messages.</span>
          <Button variant="primary" size="default" onClick={() => vm.setConnectOpen(true)}>
            Connect
          </Button>
        </div>
      ) : null}

      <nav className="arco-messenger__view-toggle" aria-label="Messenger views">
        <button
          type="button"
          className={vm.view === "hub" ? "arco-messenger__view-btn--active" : ""}
          onClick={() => vm.setView("hub")}
          aria-pressed={vm.view === "hub"}
        >
          <MessageCircle size={14} />
          Chats
        </button>
        <button
          type="button"
          className={vm.view === "inbox" ? "arco-messenger__view-btn--active" : ""}
          onClick={() => vm.setView("inbox")}
          aria-pressed={vm.view === "inbox"}
        >
          <LayoutGrid size={14} />
          Inbox
        </button>
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
