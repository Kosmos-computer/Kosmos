import { useEffect, useState } from "react";
import { EmptyState } from "../../components/ui";
import { useConnectionStore } from "../../connections/useConnectionStore";
import { PodcastHomeContent, PodcastPlayerBar, PodcastSidebar } from "./PodcastParts";
import { usePodcast } from "./usePodcast";
import { usePodcastStore } from "./podcastStore";

export function PodcastApp() {
  const vm = usePodcast();
  const connections = useConnectionStore((s) => s.connections);
  const sourceFilter = usePodcastStore((s) => s.sourceFilter);
  const activeProviderId = usePodcastStore((s) => s.activeProviderId);
  const searchQuery = usePodcastStore((s) => s.searchQuery);
  const contentFilter = usePodcastStore((s) => s.contentFilter);
  const refreshRemote = usePodcastStore((s) => s.refreshRemote);
  const init = usePodcastStore((s) => s.init);
  const [connectOpen, setConnectOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (sourceFilter === "remote") {
      void refreshRemote(connections);
    }
  }, [sourceFilter, activeProviderId, searchQuery, contentFilter, connections, refreshRemote]);

  if (vm.error && vm.localEpisodes.length === 0) {
    return (
      <div className="arco-podcast">
        <EmptyState title="Podcast library unavailable">{vm.error}</EmptyState>
      </div>
    );
  }

  return (
    <div className="arco-podcast">
      <div className="arco-podcast__body">
        <PodcastSidebar
          vm={vm}
          connectOpen={connectOpen}
          onOpenConnect={() => setConnectOpen(true)}
          onCloseConnect={() => setConnectOpen(false)}
        />
        <PodcastHomeContent vm={vm} />
      </div>
      <PodcastPlayerBar vm={vm} />
    </div>
  );
}
