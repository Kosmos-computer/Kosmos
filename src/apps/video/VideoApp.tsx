import { useEffect, useState } from "react";
import { useConnectionStore } from "../../connections/useConnectionStore";
import { VideoFeed, VideoPlayerBar, VideoSidebar } from "./VideoParts";
import { useVideo } from "./useVideo";
import { useVideoStore } from "./videoStore";

export function VideoApp() {
  const vm = useVideo();
  const connections = useConnectionStore((s) => s.connections);
  const sourceFilter = useVideoStore((s) => s.sourceFilter);
  const activeProviderId = useVideoStore((s) => s.activeProviderId);
  const searchQuery = useVideoStore((s) => s.searchQuery);
  const refreshRemote = useVideoStore((s) => s.refreshRemote);
  const [connectOpen, setConnectOpen] = useState(false);

  useEffect(() => {
    if (sourceFilter === "remote") {
      void refreshRemote(connections);
    }
  }, [sourceFilter, activeProviderId, searchQuery, connections, refreshRemote]);

  return (
    <div className="arco-video">
      <div className="arco-video__body">
        <VideoSidebar
          vm={vm}
          connectOpen={connectOpen}
          onOpenConnect={() => setConnectOpen(true)}
          onCloseConnect={() => setConnectOpen(false)}
        />
        <VideoFeed vm={vm} />
      </div>
      <VideoPlayerBar vm={vm} />
    </div>
  );
}
