import { DownloadsWorkspace } from "./DownloadsWorkspace";
import { useDownloads } from "./useDownloads";

export function DownloadsApp() {
  const vm = useDownloads();

  return <DownloadsWorkspace vm={vm} />;
}
